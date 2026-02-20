import { rpcCall, uploadFile } from './client';

// Unified auth type matching getAuthForRpc() return value
export type RpcAuth = {
  apiKey?: string;
  address?: string;
  signMessage?: (msg: string) => Promise<string>;
};

export type JobStatus = 'waiting_onchain_check' | 'open' | 'cancelled' | 'wait_for_claim' | 'done' | 'overdue' | 'failed';
export type SubmissionStatus = 'pending_review' | 'cheated' | 'not_approved' | 'approved';

export interface Job {
  id: number;
  contractJobId: string; // Changed from number to string to support uint256
  requesterAddress: string;
  doneByAddress: string | null;
  title: string;
  description: string;
  reward: string;
  deadline: string;
  minTrustScore: number;
  status: JobStatus;
  files: string[];
  createdAt: string;
  contractAddress: string;
  resultText?: string;
  resultFiles?: string[];
  jobId?: string; // For prepareJob response
}

export interface Submission {
  id: number;
  jobId: number;
  submitterAddress: string;
  status: SubmissionStatus;
  feedback: string | null;
  createdAt: string;
  resultText?: string;
  resultFiles?: string[];
}

export interface JobWithSubmissions extends Job {
  submissions: Submission[];
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
}

export interface PrepareJobParams {
  title: string;
  description: string;
  reward: string;
  deadline: string;
  minTrustScore?: number;
  files?: string[];
}

export interface CreateJobParams {
  contractJobId: number;
  title: string;
  description: string;
  reward: string;
  deadline: string;
  minTrustScore?: number;
  files?: string[];
}

export async function findOpenJobs(
  trustScore = 100,
  page = 1,
  limit = 20
): Promise<JobListResponse> {
  return rpcCall<JobListResponse>('job.findOpen', { trustScore, page, limit });
}

export async function listJobs(
  status?: JobStatus | JobStatus[],
  page = 1,
  limit = 20
): Promise<JobListResponse> {
  return rpcCall<JobListResponse>('job.list', { status, page, limit });
}

export async function getJob(
  id: number,
  requesterAddress?: string
): Promise<JobWithSubmissions> {
  return rpcCall<JobWithSubmissions>('job.get', { id, requesterAddress });
}

export async function getJobByContractId(
  contractJobId: number,
  requesterAddress?: string
): Promise<JobWithSubmissions> {
  return rpcCall<JobWithSubmissions>('job.get', { contractJobId, requesterAddress });
}

export async function prepareJob(
  params: PrepareJobParams,
  auth: RpcAuth | undefined
): Promise<Job & { jobId: string }> {
  return rpcCall<Job & { jobId: string }>('job.prepare', params as unknown as Record<string, unknown>, auth);
}

export async function confirmJob(
  jobId: string,
  auth: RpcAuth | undefined
): Promise<Job> {
  return rpcCall<Job>('job.confirmCreate', { jobId }, auth);
}

export async function createJob(
  params: CreateJobParams,
  auth: RpcAuth | undefined
): Promise<Job> {
  return rpcCall<Job>('job.create', params as unknown as Record<string, unknown>, auth);
}

export async function cancelJob(
  id: number,
  auth: RpcAuth | undefined
): Promise<Job> {
  return rpcCall<Job>('job.cancel', { id }, auth);
}

export async function submitWork(
  jobId: number,
  resultText: string,
  resultFiles: string[] | undefined,
  auth: RpcAuth | undefined
): Promise<Submission> {
  return rpcCall<Submission>('job.submit', { jobId, resultText, resultFiles }, auth);
}

export async function confirmClaim(
  jobId: number,
  auth: RpcAuth | undefined
): Promise<Job> {
  return rpcCall<Job>('job.confirmClaim', { jobId }, auth);
}

export async function checkClaimable(
  jobId: number,
  auth: RpcAuth | undefined
): Promise<{ claimable: boolean; reason: string | null; jobId?: string; job?: Job }> {
  return rpcCall<{ claimable: boolean; reason: string | null; jobId?: string; job?: Job }>(
    'job.checkClaimable', { jobId }, auth
  );
}

export async function getJobResult(
  jobId: number,
  requesterAddress: string
): Promise<{ resultText: string; resultFiles: string[] }> {
  return rpcCall<{ resultText: string; resultFiles: string[] }>('job.getResult', {
    jobId,
    requesterAddress,
  });
}

export async function uploadJobFile(file: File, jobId: number): Promise<string> {
  return uploadFile(file, 'job', jobId.toString());
}

export async function uploadSubmissionFile(
  file: File,
  jobId: number,
  submissionId: number
): Promise<string> {
  return uploadFile(file, 'submission', `${jobId}-${submissionId}`);
}
