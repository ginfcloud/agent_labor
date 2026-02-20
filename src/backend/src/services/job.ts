import { Op } from 'sequelize';
import { Job, JobStatus, Submission, SubmissionStatus, User } from '../models/index.js';
import { normalizeAddress } from '../utils/crypto.js';
import { blockchainService } from './blockchain.js';
import { verificationService } from './verification.js';
import { userService } from './user.js';
import { config } from '../config/index.js';
import { generateUniqueJobId } from '../utils/jobId.js';

export interface PrepareJobParams {
  requesterAddress: string;
  title: string;
  description: string;
  reward: string;
  deadline: Date;
  minTrustScore: number;
  files?: string[];
}

export interface CreateJobParams {
  contractJobId: number;
  requesterAddress: string;
  title: string;
  description: string;
  reward: string;
  deadline: Date;
  minTrustScore: number;
  files?: string[];
}

export interface JobFilter {
  status?: JobStatus | JobStatus[];
  requesterAddress?: string;
  page?: number;
  limit?: number;
}

class JobService {
  /**
   * Step 1: Prepare job - generate jobId and create DB record
   */
  async prepareJob(params: PrepareJobParams): Promise<{ jobId: string; job: Job }> {
    const jobId = await generateUniqueJobId();

    const job = await Job.create({
      contractJobId: jobId,
      requesterAddress: normalizeAddress(params.requesterAddress),
      title: params.title,
      description: params.description,
      reward: params.reward,
      deadline: params.deadline,
      minTrustScore: params.minTrustScore,
      status: JobStatus.WaitingOnchainCheck,
      files: params.files ? JSON.stringify(params.files) : null,
      retryCount: 0,
      lastCheckAt: null,
      txHash: null,
    });

    // Schedule retry check after 3 minutes
    this.scheduleRetryCheck(jobId);

    return { jobId, job };
  }

  /**
   * Step 2: Confirm job creation - verify on-chain and update status
   */
  async confirmCreate(jobId: string, requesterAddress: string): Promise<Job> {
    const job = await Job.findOne({ where: { contractJobId: jobId } });

    if (!job) {
      throw new Error('Job not found');
    }

    if (job.requesterAddress !== normalizeAddress(requesterAddress)) {
      throw new Error('Not authorized');
    }

    if (job.status !== JobStatus.WaitingOnchainCheck) {
      throw new Error(`Job status is ${job.status}, expected waiting_onchain_check`);
    }

    console.log(`[ConfirmCreate] JobId ${jobId}: Waiting 2s for blockchain state sync...`);
    // Wait a bit for blockchain state to fully sync
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify on-chain
    const verified = await this.verifyOnChainJob(jobId);

    if (verified) {
      await job.update({ status: JobStatus.Open });
      console.log(`[ConfirmCreate] JobId ${jobId}: ✅ Job confirmed and set to Open`);
    } else {
      await job.update({ status: JobStatus.Failed });
      console.error(`[ConfirmCreate] JobId ${jobId}: ❌ Verification failed, job set to Failed`);
      throw new Error('On-chain verification failed');
    }

    return job;
  }

  /**
   * Verify job exists and matches on-chain
   */
  async verifyOnChainJob(jobId: string): Promise<boolean> {
    try {
      const exists = await blockchainService.jobExists(jobId);
      if (!exists) {
        console.error(`[Verify] Job ${jobId}: Not found on chain`);
        return false;
      }

      const onChainJob = await blockchainService.getJob(jobId);
      const dbJob = await Job.findOne({ where: { contractJobId: jobId } });

      if (!dbJob) {
        console.error(`[Verify] Job ${jobId}: Not found in DB`);
        return false;
      }

      console.log(`[Verify] Job ${jobId}:`);
      console.log(`  Chain requester: ${onChainJob.requester}`);
      console.log(`  DB requester: ${dbJob.requesterAddress}`);
      console.log(`  Chain reward: ${onChainJob.reward.toString()}`);
      console.log(`  DB reward: ${dbJob.reward}`);

      // Verify key fields match
      const normalizedChainRequester = normalizeAddress(onChainJob.requester);
      const normalizedDbRequester = normalizeAddress(dbJob.requesterAddress);

      if (normalizedChainRequester !== normalizedDbRequester) {
        console.error(`[Verify] Job ${jobId}: Requester mismatch - chain: ${normalizedChainRequester}, db: ${normalizedDbRequester}`);
        return false;
      }

      // Compare rewards as strings to avoid BigInt precision issues
      if (onChainJob.reward.toString() !== dbJob.reward) {
        console.error(`[Verify] Job ${jobId}: Reward mismatch - chain: ${onChainJob.reward.toString()}, db: ${dbJob.reward}`);
        return false;
      }

      console.log(`[Verify] Job ${jobId}: ✅ Verification successful`);
      return true;
    } catch (error) {
      console.error(`[Verify] Job ${jobId}: Error during verification:`, error);
      return false;
    }
  }

  /**
   * Retry verification for jobs waiting on-chain check
   */
  async retryVerification(jobId: string): Promise<void> {
    const job = await Job.findOne({ where: { contractJobId: jobId } });

    if (!job || job.status !== JobStatus.WaitingOnchainCheck) {
      return;
    }

    if (job.retryCount >= config.jobVerification.maxRetries) {
      await job.update({ status: JobStatus.Failed });
      console.log(`Job ${jobId} marked as failed after ${job.retryCount} retries`);
      return;
    }

    const verified = await this.verifyOnChainJob(jobId);

    if (verified) {
      await job.update({ status: JobStatus.Open });
      console.log(`Job ${jobId} verified and marked as open`);
    } else {
      const newRetryCount = job.retryCount + 1;
      await job.update({
        retryCount: newRetryCount,
        lastCheckAt: new Date(),
      });

      if (newRetryCount < config.jobVerification.maxRetries) {
        // Schedule next retry
        this.scheduleRetryCheck(jobId);
      } else {
        await job.update({ status: JobStatus.Failed });
        console.log(`Job ${jobId} marked as failed after max retries`);
      }
    }
  }

  /**
   * Schedule a retry check after timeout
   */
  private scheduleRetryCheck(jobId: string): void {
    setTimeout(() => {
      this.retryVerification(jobId).catch(err => {
        console.error(`Error in retry verification for job ${jobId}:`, err);
      });
    }, config.jobVerification.retryTimeoutMs);
  }

  /**
   * Legacy create method - kept for compatibility
   */
  async create(params: CreateJobParams): Promise<Job> {
    const job = await Job.create({
      contractJobId: params.contractJobId.toString(),
      requesterAddress: normalizeAddress(params.requesterAddress),
      title: params.title,
      description: params.description,
      reward: params.reward,
      deadline: params.deadline,
      minTrustScore: params.minTrustScore,
      status: JobStatus.Open,
      files: params.files ? JSON.stringify(params.files) : null,
      retryCount: 0,
    });
    return job;
  }

  async getById(id: number): Promise<Job | null> {
    return Job.findByPk(id, {
      include: [{ model: Submission, as: 'submissions' }],
    });
  }

  async getByContractJobId(contractJobId: number): Promise<Job | null> {
    return Job.findOne({
      where: { contractJobId },
      include: [{ model: Submission, as: 'submissions' }],
    });
  }

  async findJobs(filter: JobFilter): Promise<{ jobs: Job[]; total: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filter.status) {
      where.status = Array.isArray(filter.status) ? { [Op.in]: filter.status } : filter.status;
    }

    if (filter.requesterAddress) {
      where.requesterAddress = normalizeAddress(filter.requesterAddress);
    }

    const { rows: jobs, count: total } = await Job.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return { jobs, total };
  }

  async findOpenJobs(minTrustScore: number, page = 1, limit = 20): Promise<{ jobs: Job[]; total: number }> {
    const offset = (page - 1) * limit;

    const { rows: jobs, count: total } = await Job.findAndCountAll({
      where: {
        status: JobStatus.Open,
        minTrustScore: { [Op.lte]: minTrustScore },
        deadline: { [Op.gt]: new Date() },
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    return { jobs, total };
  }

  async cancelJob(jobId: number, requesterAddress: string): Promise<Job> {
    const job = await Job.findByPk(jobId);
    if (!job) throw new Error('Job not found');
    if (job.requesterAddress !== normalizeAddress(requesterAddress)) {
      throw new Error('Not authorized');
    }
    if (job.status !== JobStatus.Open && job.status !== JobStatus.Overdue) {
      throw new Error('Job cannot be cancelled');
    }

    // Mark all pending submissions as not approved
    await Submission.update(
      { status: SubmissionStatus.NotApproved, feedback: 'Job was cancelled' },
      { where: { jobId, status: SubmissionStatus.PendingReview } }
    );

    await job.update({ status: JobStatus.Cancelled });
    return job;
  }

  async checkOverdueJobs(): Promise<void> {
    const overdueJobs = await Job.findAll({
      where: {
        status: JobStatus.Open,
        deadline: { [Op.lt]: new Date() },
      },
    });

    for (const job of overdueJobs) {
      // Cancel all pending submissions
      await Submission.update(
        { status: SubmissionStatus.NotApproved, feedback: 'Job deadline passed' },
        { where: { jobId: job.id, status: SubmissionStatus.PendingReview } }
      );
      await job.update({ status: JobStatus.Overdue });
    }
  }

  async submitWork(
    jobId: number,
    submitterAddress: string,
    resultText: string,
    resultFiles?: string[]
  ): Promise<Submission> {
    const normalizedAddress = normalizeAddress(submitterAddress);
    const job = await Job.findByPk(jobId);

    if (!job) throw new Error('Job not found');
    if (job.status !== JobStatus.Open) throw new Error('Job is not open');
    if (new Date() > job.deadline) throw new Error('Job deadline passed');

    // Check if user already submitted
    const existingSubmission = await Submission.findOne({
      where: { jobId, submitterAddress: normalizedAddress },
    });
    if (existingSubmission) throw new Error('Already submitted');

    // Check trust score
    const user = await userService.findOrCreate(submitterAddress);
    if (user.trustScore < job.minTrustScore) {
      throw new Error('Trust score too low');
    }

    const submission = await Submission.create({
      jobId,
      submitterAddress: normalizedAddress,
      resultText,
      resultFiles: resultFiles ? JSON.stringify(resultFiles) : null,
      status: SubmissionStatus.PendingReview,
      submitterTrustScore: user.trustScore,
    });

    // Start async verification
    this.processSubmission(submission.id).catch(console.error);

    return submission;
  }

  private async processSubmission(submissionId: number): Promise<void> {
    const submission = await Submission.findByPk(submissionId, {
      include: [{ model: Job, as: 'job' }],
    });
    if (!submission || !submission.job) return;

    const job = submission.job as Job;

    // Check if job is still open
    if (job.status !== JobStatus.Open) {
      await submission.update({
        status: SubmissionStatus.NotApproved,
        feedback: 'Job is no longer open',
      });
      return;
    }

    const jobFiles = job.files ? JSON.parse(job.files) : [];
    const submissionFiles = submission.resultFiles ? JSON.parse(submission.resultFiles) : [];

    const result = await verificationService.verifySubmission(
      job.description,
      jobFiles,
      submission.resultText,
      submissionFiles
    );

    if (result.cheated) {
      await submission.update({
        status: SubmissionStatus.Cheated,
        feedback: result.feedback,
      });
      await userService.updateTrustScore(submission.submitterAddress, config.trustScore.onCheated);
      return;
    }

    if (!result.approved) {
      await submission.update({
        status: SubmissionStatus.NotApproved,
        feedback: result.feedback,
      });
      return;
    }

    // Approved — set holding state BEFORE blockchain call
    // Trust score awarded immediately on AI approval
    await userService.updateTrustScore(submission.submitterAddress, config.trustScore.onApproved);

    // Mark both job and submission as WaitOnChainApprove
    // This state persists if blockchain fails — cron will retry
    await job.update({
      status: JobStatus.WaitOnChainApprove,
      doneByAddress: submission.submitterAddress,
      resultText: submission.resultText,
      resultFiles: submission.resultFiles,
    });
    await submission.update({
      status: SubmissionStatus.WaitOnChainApprove,
      feedback: result.feedback,
    });

    // Write to blockchain
    try {
      await blockchainService.setJobDone(job.contractJobId, submission.submitterAddress);
      // Success — advance to WaitForClaim
      await job.update({ status: JobStatus.WaitForClaim });
      await submission.update({ status: SubmissionStatus.Approved });
      console.log(`[processSubmission] Job ${job.id} → WaitForClaim, submission ${submission.id} → Approved`);
    } catch (err) {
      // Fail — leave as WaitOnChainApprove, cron will retry
      console.error(`[processSubmission] setJobDone failed for job ${job.id}, will retry via cron:`, err);
    }
  }

  async markJobDone(jobId: number): Promise<Job> {
    const job = await Job.findByPk(jobId);
    if (!job) throw new Error('Job not found');
    if (job.status !== JobStatus.WaitForClaim) throw new Error('Job not waiting for claim');

    await job.update({ status: JobStatus.Done });
    return job;
  }

  async getJobHistory(address: string, page = 1, limit = 20): Promise<{
    requested: { jobs: Job[]; total: number };
    completed: { jobs: Job[]; total: number };
  }> {
    const normalizedAddress = normalizeAddress(address);
    const offset = (page - 1) * limit;

    const [requestedResult, completedResult] = await Promise.all([
      Job.findAndCountAll({
        where: { requesterAddress: normalizedAddress },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }),
      Job.findAndCountAll({
        where: { doneByAddress: normalizedAddress },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }),
    ]);

    return {
      requested: { jobs: requestedResult.rows, total: requestedResult.count },
      completed: { jobs: completedResult.rows, total: completedResult.count },
    };
  }

  formatJob(job: Job, includeResult = false) {
    const base = {
      id: job.id,
      contractJobId: job.contractJobId,
      requesterAddress: job.requesterAddress,
      doneByAddress: job.doneByAddress,
      title: job.title,
      description: job.description,
      reward: job.reward,
      deadline: job.deadline.toISOString(),
      minTrustScore: job.minTrustScore,
      status: job.status,
      files: job.files ? JSON.parse(job.files) : [],
      createdAt: job.createdAt.toISOString(),
      contractAddress: blockchainService.getContractAddress(),
    };

    if (includeResult && job.status === JobStatus.Done) {
      return {
        ...base,
        resultText: job.resultText,
        resultFiles: job.resultFiles ? JSON.parse(job.resultFiles) : [],
      };
    }

    return base;
  }

  formatSubmission(submission: Submission, canViewResult = false) {
    const base = {
      id: submission.id,
      jobId: submission.jobId,
      submitterAddress: submission.submitterAddress,
      status: submission.status,
      feedback: submission.feedback,
      createdAt: submission.createdAt.toISOString(),
    };

    if (canViewResult && submission.status === SubmissionStatus.Approved) {
      return {
        ...base,
        resultText: submission.resultText,
        resultFiles: submission.resultFiles ? JSON.parse(submission.resultFiles) : [],
      };
    }

    return base;
  }


  async retryPendingSubmissions(): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_INTERVAL_MS = 5 * 60 * 1000;

    const stuckSubmissions = await Submission.findAll({
      where: {
        status: SubmissionStatus.PendingReview,
        retryCount: { [Op.lt]: MAX_RETRIES },
        [Op.or]: [
          { lastRetryAt: null },
          { lastRetryAt: { [Op.lt]: new Date(Date.now() - RETRY_INTERVAL_MS) } }
        ]
      },
      include: [{ model: Job, as: 'job', required: true }]
    });

    console.log(`[RetryPending] Found ${stuckSubmissions.length} submissions to retry`);

    for (const submission of stuckSubmissions) {
      try {
        console.log(`[RetryPending] Retrying submission ${submission.id} (attempt ${submission.retryCount + 1}/${MAX_RETRIES})`);

        await submission.update({
          retryCount: submission.retryCount + 1,
          lastRetryAt: new Date()
        });

        await this.processSubmission(submission.id);
        console.log(`[RetryPending] Successfully processed submission ${submission.id}`);
      } catch (error) {
        console.error(`[RetryPending] Error retrying submission ${submission.id}:`, error);

        if (submission.retryCount >= MAX_RETRIES) {
          await submission.update({
            status: SubmissionStatus.NotApproved,
            feedback: 'Verification failed after maximum retries. Please submit again.'
          });
          console.log(`[RetryPending] Marked submission ${submission.id} as failed after ${MAX_RETRIES} retries`);
        }
      }
    }
  }

  /**
   * Cron: retry setJobDone for submissions stuck in WaitOnChainApprove.
   * Runs every 3 minutes (reuses jobVerification.retryTimeoutMs config).
   * Max 3 retries — after that: submission → Failed, job → Open (reopened).
   */
  async retryWaitOnChainApprove(): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_INTERVAL_MS = config.jobVerification.retryTimeoutMs; // 3 min

    const stuckSubmissions = await Submission.findAll({
      where: {
        status: SubmissionStatus.WaitOnChainApprove,
        retryCount: { [Op.lt]: MAX_RETRIES },
        [Op.or]: [
          { lastRetryAt: null },
          { lastRetryAt: { [Op.lt]: new Date(Date.now() - RETRY_INTERVAL_MS) } },
        ],
      },
      include: [{ model: Job, as: 'job', required: true }],
    });

    console.log(`[RetryOnChain] Found ${stuckSubmissions.length} submissions waiting for setJobDone`);

    for (const submission of stuckSubmissions) {
      const job = submission.job as Job;
      const attempt = submission.retryCount + 1;

      console.log(`[RetryOnChain] Retrying setJobDone for submission ${submission.id}, job ${job.id} (attempt ${attempt}/${MAX_RETRIES})`);

      // Increment retry counter first
      await submission.update({
        retryCount: attempt,
        lastRetryAt: new Date(),
      });

      try {
        await blockchainService.setJobDone(job.contractJobId, submission.submitterAddress);

        // Success — advance both to final states
        await job.update({ status: JobStatus.WaitForClaim });
        await submission.update({ status: SubmissionStatus.Approved });
        console.log(`[RetryOnChain] ✅ Job ${job.id} → WaitForClaim, submission ${submission.id} → Approved`);
      } catch (err) {
        console.error(`[RetryOnChain] ❌ setJobDone failed (attempt ${attempt}):`, err);

        if (attempt >= MAX_RETRIES) {
          // All retries exhausted — mark failed, reopen job for new submissions
          await submission.update({
            status: SubmissionStatus.Failed,
            feedback: 'Blockchain write failed after 3 attempts. Job has been reopened.',
          });
          await job.update({
            status: JobStatus.Open,
            doneByAddress: null,
            resultText: null,
            resultFiles: null,
          });
          console.log(`[RetryOnChain] ⚠️ Max retries reached — submission ${submission.id} → Failed, job ${job.id} → Open`);
        }
        // else: leave as WaitOnChainApprove, will retry next cron tick
      }
    }
  }
}

export const jobService = new JobService();

