import { readFileSync } from 'fs';
import { join } from 'path';

export const config = {
  port: 443,
  host: '0.0.0.0',

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
  baseUrl: process.env.BASE_URL || 'https://localhost:443',
};
