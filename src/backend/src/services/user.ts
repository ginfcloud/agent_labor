import { User } from '../models/index.js';
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
}

export const userService = new UserService();
