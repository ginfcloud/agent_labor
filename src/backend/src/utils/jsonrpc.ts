export interface JsonRpcRequest {
  method: string;
  params: Record<string, unknown>;
  signature?: string;
  address?: string;
  timestamp?: number;
}

export interface JsonRpcSuccessResponse<T = unknown> {
  result: T;
}

export interface JsonRpcErrorResponse {
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

export function success<T>(result: T): JsonRpcSuccessResponse<T> {
  return { result };
}

export function error(code: number, message: string, data?: unknown): JsonRpcErrorResponse {
  return { error: { code, message, data } };
}

// Error codes
export const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // Custom errors (1000+)
  INVALID_SIGNATURE: 1001,
  SIGNATURE_EXPIRED: 1002,
  UNAUTHORIZED: 1003,
  NOT_FOUND: 1004,
  ALREADY_EXISTS: 1005,
  INVALID_STATUS: 1006,
  FORBIDDEN: 1007,
  UPLOAD_ERROR: 1008,
  VERIFICATION_FAILED: 1009,
  CONTRACT_ERROR: 1010,
  INSUFFICIENT_TRUST_SCORE: 1011,
} as const;
