import { ethers } from 'ethers';
import { config } from '../config/index.js';

const ABI = [
  'function createJob(uint256 _jobId) external payable returns (uint256)',
  'function cancelJob(uint256 _jobId) external',
  'function setJobDone(uint256 _jobId, address _doneBy) external',
  'function claimReward(uint256 _jobId) external',
  'function getJob(uint256 _jobId) external view returns (tuple(uint256 jobId, address requester, address doneBy, uint256 reward, uint8 status))',
  'function getOpenJobs(uint256 _offset, uint256 _limit) external view returns (tuple(uint256 jobId, address requester, address doneBy, uint256 reward, uint8 status)[], uint256 total)',
  'function jobCount() external view returns (uint256)',
  'function jobRegistered(uint256 _jobId) external view returns (bool)',
  'event JobCreated(uint256 indexed jobId, address indexed requester, uint256 reward)',
  'event JobCancelled(uint256 indexed jobId, address indexed requester)',
  'event JobCompleted(uint256 indexed jobId, address indexed doneBy)',
  'event RewardClaimed(uint256 indexed jobId, address indexed claimer, uint256 amount, uint256 fee)',
];

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private systemWallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    this.systemWallet = new ethers.Wallet(config.blockchain.systemPrivateKey, this.provider);
    this.contract = new ethers.Contract(config.blockchain.contractAddress, ABI, this.systemWallet);
  }

  async setJobDone(jobId: string, doneByAddress: string): Promise<string> {
    const tx = await this.contract.setJobDone(BigInt(jobId), doneByAddress);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getJob(jobId: string): Promise<{
    jobId: bigint;
    requester: string;
    doneBy: string;
    reward: bigint;
    status: bigint; // ethers v6 returns ALL integers as BigInt, including uint8 enum
  }> {
    return await this.contract.getJob(BigInt(jobId));
  }

  async getJobCount(): Promise<number> {
    const count = await this.contract.jobCount();
    return Number(count);
  }

  getContractAddress(): string {
    return config.blockchain.contractAddress;
  }

  getSystemAddress(): string {
    return this.systemWallet.address;
  }

  async jobExists(jobId: string): Promise<boolean> {
    try {
      console.log(`[BlockchainService] Checking jobExists for jobId: ${jobId}`);
      console.log(`[BlockchainService] Contract: ${this.contract.target}`);

      const result = await this.contract.jobRegistered(BigInt(jobId));
      console.log(`[BlockchainService] jobRegistered result: ${result}`);
      return result;
    } catch (error: any) {
      console.error(`[BlockchainService] Error in jobExists:`, error.message);
      return false;
    }
  }

  /**
   * Get on-chain job status.
   * Returns: 0 = Open, 1 = Cancelled, 2 = Done
   * NOTE: ethers v6 returns BigInt for all integers — we explicitly convert to number here.
   */
  async getJobOnChainStatus(jobId: string): Promise<{ status: number; doneBy: string; reward: bigint }> {
    const job = await this.getJob(jobId);
    return {
      status: Number(job.status), // BigInt → number for safe === comparison
      doneBy: job.doneBy,
      reward: job.reward,
    };
  }
}

export const blockchainService = new BlockchainService();
