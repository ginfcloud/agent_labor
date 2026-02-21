import { readFileSync } from 'fs';
import { join } from 'path';

export const config = {
  port: 443,
  host: '0.0.0.0',

  ssl: {
    key: readFileSync(join(process.cwd(), 'certs', 'file.key')),
    cert: readFileSync(join(process.cwd(), 'certs', 'file.cert')),
    ca: readFileSync(join(process.cwd(), 'certs', 'file.ca-bundle')),
  },

  db: {
    dialect: 'sqlite' as const,
    storage: join(process.cwd(), 'data', 'database.sqlite'),
  },

  blockchain: {
    rpcUrl: process.env.ARB_RPC || 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    systemPrivateKey: process.env.SYSTEM_PRIVATE_KEY || '',
  },

  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || '',
    projectId: process.env.GCS_PROJECT_ID || '',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-2.5-flash',
  },

  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB per job
  },

  trustScore: {
    initial: 50,
    onApproved: 1,
    onCheated: -10,
  },

  verification: {
    timeoutMs: 5 * 60 * 1000, // 5 minutes
  },

  jobVerification: {
    retryTimeoutMs: 3 * 60 * 1000, // 3 minutes  
    maxRetries: 2,
  },

  baseUrl: process.env.BASE_URL || 'https://localhost:443',
};
