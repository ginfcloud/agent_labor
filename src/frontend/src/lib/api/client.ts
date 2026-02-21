import { VITE_API_URL } from '$lib/config.js';
import { walletService } from '$lib/services/wallet';
const API_BASE = VITE_API_URL;

export interface JsonRpcRequest {
  method: string;
  params: Record<string, unknown>;
  apiKey?: string;
  signature?: string;
  address?: string;
  timestamp?: number;
}

export interface JsonRpcResponse<T = unknown> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Methods that require signature (only critical auth operations)
const SIGNATURE_METHODS = ['auth.signin'];

export async function rpcCall<T>(
  method: string,
  params: Record<string, unknown> = {},
  auth?: {
    apiKey?: string;
    address?: string;
    signMessage?: (msg: string) => Promise<string>;
  }
): Promise<T> {
  const body: JsonRpcRequest = { method, params };

  // Use signature for critical methods
  if (SIGNATURE_METHODS.includes(method) && auth?.address && auth?.signMessage) {
    const timestamp = Date.now();
    const message = JSON.stringify({ method, params, timestamp });
    const signature = await auth.signMessage(message);

    body.address = auth.address;
    body.signature = signature;
    body.timestamp = timestamp;
  }
  // Use API key for other authenticated methods
  else if (auth?.apiKey) {
    body.apiKey = auth.apiKey;
  }

  const response = await fetch(`${API_BASE}/api/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: JsonRpcResponse<T> = await response.json();

  if (data.error) {
    const msg = data.error.message;
    if (msg.toLowerCase().includes('invalid api key')) {
      console.warn('[rpcCall] Invalid API key detected — auto-disconnecting wallet');
      walletService.disconnect();
    }
    throw new Error(msg);
  }

  return data.result as T;
}

export async function uploadFile(
  file: File,
  type: 'avatar' | 'job' | 'submission',
  id: string
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/upload?type=${type}&id=${id}`, {
    method: 'POST',
    body: formData,
  });

  const data: JsonRpcResponse<{ url: string }> = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.result!.url;
}

export function getSkillMdUrl(): string {
  // Runtime environment detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local dev: served as a static file by SvelteKit at /local-skill.md
      return `${window.location.origin}/local-skill.md`;
    }
    // Production domain
    return 'https://agentlabor.xyz/skill.md';
  }
  // SSR fallback (won't be used in practice for this modal)
  return `${API_BASE}/skill.md`;
}
