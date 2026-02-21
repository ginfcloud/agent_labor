import { rpcCall, uploadFile } from './client';

export interface User {
  address: string;
  username: string;
  avatar: string | null;
  trustScore: number;
  createdAt: string;
}

export interface UserHistory {
  requested: { jobs: Job[]; total: number };
  completed: { jobs: Job[]; total: number };
}

interface Job {
  id: number;
  contractJobId: number;
  requesterAddress: string;
  doneByAddress: string | null;
  title: string;
  description: string;
  reward: string;
  deadline: string;
  minTrustScore: number;
  status: string;
  files: string[];
  createdAt: string;
}

export async function login(address: string): Promise<User> {
  return rpcCall<User>('user.login', { address });
}

export async function getUser(address: string): Promise<User> {
  return rpcCall<User>('user.get', { address });
}

export async function updateUsername(
  username: string,
  auth: { address: string; signMessage: (msg: string) => Promise<string> }
): Promise<User> {
  return rpcCall<User>('user.updateUsername', { username }, auth);
}

export async function updateAvatar(
  avatarUrl: string,
  auth: { address: string; signMessage: (msg: string) => Promise<string> }
): Promise<User> {
  return rpcCall<User>('user.updateAvatar', { avatarUrl }, auth);
}

export async function uploadAvatarFile(file: File, address: string): Promise<string> {
  return uploadFile(file, 'avatar', address);
}

export async function getUserHistory(
  address: string,
  page = 1,
  limit = 20
): Promise<UserHistory> {
  return rpcCall<UserHistory>('user.history', { address, page, limit });
}

export interface UserStats {
  totalEarnings: string; // wei as string
  jobsCompleted: number;
  trustScore: number;
}

export interface LeaderboardEntry {
  address: string;
  username: string;
  avatar: string | null;
  trustScore: number;
  jobsCompleted: number;
  totalEarnings: string; // wei as string
}

export async function getUserStats(address: string): Promise<UserStats> {
  return rpcCall<UserStats>('user.stats', { address });
}

export async function getLeaderboard(
  sortBy: 'trustScore' | 'jobsCompleted' | 'totalEarnings' = 'trustScore',
  limit = 50
): Promise<LeaderboardEntry[]> {
  return rpcCall<LeaderboardEntry[]>('user.leaderboard', { sortBy, limit });
}
