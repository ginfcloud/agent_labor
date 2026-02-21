import { User, Job, JobStatus } from '../models/index.js';
import { Op, literal, fn, col } from 'sequelize';
import { config } from '../config/index.js';
import { normalizeAddress } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';

class UserService {
  async findOrCreate(address: string): Promise<User> {
    const normalizedAddress = normalizeAddress(address);

    let user = await User.findOne({ where: { address: normalizedAddress } });

    if (!user) {
      const shortId = uuidv4().slice(0, 8);
      user = await User.create({
        address: normalizedAddress,
        username: `user-${shortId}`,
        trustScore: config.trustScore.initial,
      });
    }

    return user;
  }

  async getByAddress(address: string): Promise<User | null> {
    return User.findOne({ where: { address: normalizeAddress(address) } });
  }

  async updateUsername(address: string, username: string): Promise<User> {
    const normalizedAddress = normalizeAddress(address);

    // Check username format
    if (!/^[a-zA-Z0-9]{1,20}$/.test(username)) {
      throw new Error('Username must be alphanumeric and max 20 characters');
    }

    // Check if username already exists
    const existing = await User.findOne({ where: { username } });
    if (existing && existing.address !== normalizedAddress) {
      throw new Error('Username already taken');
    }

    const [count] = await User.update(
      { username },
      { where: { address: normalizedAddress } }
    );

    if (count === 0) {
      throw new Error('User not found');
    }

    return (await User.findOne({ where: { address: normalizedAddress } }))!;
  }

  async updateAvatar(address: string, avatarUrl: string): Promise<User> {
    const normalizedAddress = normalizeAddress(address);

    const [count] = await User.update(
      { avatar: avatarUrl },
      { where: { address: normalizedAddress } }
    );

    if (count === 0) {
      throw new Error('User not found');
    }

    return (await User.findOne({ where: { address: normalizedAddress } }))!;
  }

  async updateTrustScore(address: string, delta: number): Promise<User> {
    const normalizedAddress = normalizeAddress(address);
    const user = await User.findOne({ where: { address: normalizedAddress } });

    if (!user) {
      throw new Error('User not found');
    }

    const newScore = Math.max(0, Math.min(100, user.trustScore + delta));
    await user.update({ trustScore: newScore });

    return user;
  }

  formatUser(user: User) {
    return {
      address: user.address,
      username: user.username,
      avatar: user.avatar,
      trustScore: user.trustScore,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async getUserStats(address: string): Promise<{ totalEarnings: string; jobsCompleted: number; trustScore: number }> {
    const normalizedAddress = normalizeAddress(address);

    const user = await User.findOne({ where: { address: normalizedAddress } });
    if (!user) return { totalEarnings: '0', jobsCompleted: 0, trustScore: 0 };

    // All jobs where this user was the worker and reward is claimed/approved
    const completedJobs = await Job.findAll({
      where: {
        doneByAddress: normalizedAddress,
        status: { [Op.in]: [JobStatus.WaitForClaim, JobStatus.Done] },
      },
      attributes: ['reward'],
    });

    const totalEarnings = completedJobs.reduce((sum, job) => {
      try { return sum + BigInt(job.reward); } catch { return sum; }
    }, BigInt(0));

    return {
      totalEarnings: totalEarnings.toString(),
      jobsCompleted: completedJobs.length,
      trustScore: user.trustScore,
    };
  }

  async getLeaderboard(
    sortBy: 'trustScore' | 'jobsCompleted' | 'totalEarnings' = 'trustScore',
    limit = 50
  ): Promise<Array<{ address: string; username: string; avatar: string | null; trustScore: number; jobsCompleted: number; totalEarnings: string }>> {
    // Get all users
    const users = await User.findAll({ attributes: ['address', 'username', 'avatar', 'trustScore'] });

    // Count completed jobs per address
    const completedCounts = await Job.findAll({
      where: {
        doneByAddress: { [Op.ne]: null },
        status: { [Op.in]: [JobStatus.WaitForClaim, JobStatus.Done] },
      },
      attributes: [
        'doneByAddress',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', literal('CAST(reward AS NUMERIC)')), 'totalReward'],
      ],
      group: ['doneByAddress'],
      raw: true,
    }) as unknown as Array<{ doneByAddress: string; count: string; totalReward: string }>;

    const statsMap = new Map(
      completedCounts.map(r => [r.doneByAddress, {
        jobsCompleted: parseInt(r.count) || 0,
        totalEarnings: r.totalReward || '0',
      }])
    );

    const entries = users.map(u => ({
      address: u.address,
      username: u.username,
      avatar: u.avatar,
      trustScore: u.trustScore,
      jobsCompleted: statsMap.get(u.address)?.jobsCompleted ?? 0,
      totalEarnings: statsMap.get(u.address)?.totalEarnings ?? '0',
    }));

    // Sort
    entries.sort((a, b) => {
      if (sortBy === 'jobsCompleted') return b.jobsCompleted - a.jobsCompleted;
      if (sortBy === 'totalEarnings') {
        try {
          const diff = BigInt(b.totalEarnings) - BigInt(a.totalEarnings);
          return diff > 0n ? 1 : diff < 0n ? -1 : 0;
        } catch { return 0; }
      }
      return b.trustScore - a.trustScore;
    });

    return entries.slice(0, limit);
  }
}

export const userService = new UserService();
