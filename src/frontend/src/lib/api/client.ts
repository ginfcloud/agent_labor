const API_BASE = import.meta.env.VITE_API_URL || 'https://localhost:443';

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
    throw new Error(data.error.message);
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
  return `${API_BASE}/skill.md`;
}
