import { ethers } from 'ethers';

export function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function createSignMessage(method: string, params: Record<string, unknown>, timestamp: number): string {
  return JSON.stringify({ method, params, timestamp });
}

export function isSignatureExpired(timestamp: number, maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): boolean {
  return Date.now() - timestamp > maxAgeMs;
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}
