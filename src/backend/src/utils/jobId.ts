import { randomBytes } from 'crypto';
import { Job } from '../models/index.js';

/**
 * Generate a random uint256 jobId (32 bytes)
 * Returns as decimal string representation
 */
export function generateJobId(): string {
    // Generate 32 random bytes
    const bytes = randomBytes(32);

    // Convert to BigInt (uint256)
    let value = BigInt(0);
    for (let i = 0; i < bytes.length; i++) {
        value = (value << BigInt(8)) | BigInt(bytes[i]);
    }

    // Ensure it's not 0
    if (value === BigInt(0)) {
        value = BigInt(1);
    }

    return value.toString();
}

/**
 * Check if jobId already exists in database
 */
export async function isJobIdUnique(jobId: string): Promise<boolean> {
    const existing = await Job.findOne({
        where: { contractJobId: jobId },
    });
    return existing === null;
}

/**
 * Generate a unique jobId that doesn't exist in database
 */
export async function generateUniqueJobId(): Promise<string> {
    let jobId: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
        jobId = generateJobId();
        attempts++;

        if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique jobId after multiple attempts');
        }
    } while (!(await isJobIdUnique(jobId)));

    return jobId;
}
