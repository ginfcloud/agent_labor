import { ethers } from 'ethers';
import { signIn, getAuth } from './auth';
import { get } from 'svelte/store';
import { authStore } from '../stores/auth';
import { user } from '../stores';
import { signOut } from './auth';
import { ARBITRUM_ONE_CHAIN_ID, ARBITRUM_ONE_CONFIG } from '../config.js';


class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private listenersAttached = false;

  /**
   * Attach MetaMask event listeners once.
   * Handles: accountsChanged, disconnect
   */
  private attachListeners() {
    if (this.listenersAttached || typeof window === 'undefined' || !window.ethereum) return;
    this.listenersAttached = true;

    // Fired when user switches account or disconnects in MetaMask
    window.ethereum.on('accountsChanged', ((...args: unknown[]) => {
      const accounts = args[0] as string[];
      console.log('[Wallet] accountsChanged:', accounts);
      if (!accounts || accounts.length === 0) {
        this.handleDisconnect();
      } else {
        this.handleDisconnect();
        console.log('[Wallet] Account changed, please reconnect.');
      }
    }) as (...args: unknown[]) => void);

    // Fired when MetaMask loses connection to the chain
    window.ethereum.on('disconnect', () => {
      console.log('[Wallet] MetaMask disconnected');
      this.handleDisconnect();
    });
  }

  private handleDisconnect() {
    this.provider = null;
    this.signer = null;
    user.logout();
    signOut();
    console.log('[Wallet] State cleared');
  }

  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await this.provider.send('eth_requestAccounts', []);
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }

    await this.switchNetwork();

    this.signer = await this.provider.getSigner();
    const address = await this.signer.getAddress();
    const normalizedAddress = address.toLowerCase();

    // Attach listeners after first successful connect
    this.attachListeners();

    // Auto-signin if not signed in or different account
    const auth = get(authStore);
    if (!auth.apiKey || auth.address !== normalizedAddress) {
      console.log('[Wallet] Auto-signing in...');
      await signIn(normalizedAddress, (msg: string) => this.signer!.signMessage(msg));
    }

    return normalizedAddress;
  }

  /**
   * Silently restore provider+signer from MetaMask without requesting accounts.
   * Used on page reload when user is already connected.
   */
  async reconnect(address: string): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) return false;
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_accounts' })) as string[];
      if (!accounts || accounts.length === 0) return false;
      if (accounts[0].toLowerCase() !== address) return false;

      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.attachListeners();
      console.log('[Wallet] Signer restored for', address);
      return true;
    } catch {
      return false;
    }
  }

  async switchNetwork(): Promise<void> {
    if (!this.provider) throw new Error('Provider not initialized');
    try {
      await this.provider.send('wallet_switchEthereumChain', [{ chainId: ARBITRUM_ONE_CHAIN_ID }]);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await this.provider.send('wallet_addEthereumChain', [ARBITRUM_ONE_CONFIG]);
      } else {
        throw switchError;
      }
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) throw new Error('Wallet not connected');
    return this.signer.signMessage(message);
  }

  async getAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return (await this.signer.getAddress()).toLowerCase();
  }

  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  async getFreshSigner(): Promise<ethers.Signer> {
    if (!this.provider) throw new Error('Provider not initialized');
    const signer = await this.provider.getSigner();
    this.signer = signer;
    return signer;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  isConnected(): boolean {
    return this.signer !== null;
  }

  /**
   * Get auth params for RPC calls.
   * Returns API key + signMessage for all methods.
   */
  getAuthForRpc(): { apiKey?: string; address?: string; signMessage?: (msg: string) => Promise<string> } | undefined {
    const auth = getAuth();
    if (!auth || !auth.apiKey) return undefined;
    return {
      ...auth,
      signMessage: (msg: string) => this.signMessage(msg),
    };
  }

  disconnect(): void {
    this.handleDisconnect();
  }
}

export const walletService = new WalletService();

// ─── Contract interaction ────────────────────────────────────────────────────

const CONTRACT_ABI = [
  'function createJob(uint256 _jobId) external payable returns (uint256)',
  'function cancelJob(uint256 _jobId) external',
  'function claimReward(uint256 _jobId) external',
  'function getJob(uint256 _jobId) external view returns (tuple(uint256 jobId, address requester, address doneBy, uint256 reward, uint8 status))',
  'event JobCreated(uint256 indexed jobId, address indexed requester, uint256 reward)',
];

export async function createJobOnChain(
  contractAddress: string,
  jobId: string,
  rewardWei: string
): Promise<void> {
  if (!walletService.getSigner()) throw new Error('Wallet not connected');

  await walletService.switchNetwork();
  const signer = await walletService.getFreshSigner();

  const valueWei = BigInt(rewardWei);

  // Check balance before sending — gives clear error instead of cryptic MetaMask -32603
  const provider = walletService.getProvider();
  if (provider) {
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    if (balance < valueWei) {
      const balanceETH = ethers.formatEther(balance);
      const neededETH = ethers.formatEther(valueWei);
      throw new Error(`Insufficient ETH balance. Have: ${balanceETH} ETH, need ${neededETH} ETH`);
    }
  }

  console.log('[CreateJob] Contract:', contractAddress, 'JobId:', jobId, 'Reward (wei):', valueWei.toString());
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
  const tx = await contract.createJob(BigInt(jobId), { value: valueWei });
  console.log('[CreateJob] tx:', tx.hash);
  await tx.wait();
  console.log('[CreateJob] confirmed!');
}


export async function cancelJobOnChain(
  contractAddress: string,
  jobId: string
): Promise<string> {
  if (!walletService.getSigner()) throw new Error('Wallet not connected');

  await walletService.switchNetwork();
  const signer = await walletService.getFreshSigner();

  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
  const tx = await contract.cancelJob(BigInt(jobId));
  const receipt = await tx.wait();
  return receipt.hash;
}

export async function claimRewardOnChain(
  contractAddress: string,
  jobId: string
): Promise<string> {
  if (!walletService.getSigner()) throw new Error('Wallet not connected');

  await walletService.switchNetwork();
  const signer = await walletService.getFreshSigner();

  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
  const tx = await contract.claimReward(BigInt(jobId));
  const receipt = await tx.wait();
  return receipt.hash;
}

export function parseEther(value: string): string {
  return ethers.parseEther(value).toString();
}

export function formatEther(wei: string): string {
  return ethers.formatEther(wei);
}
