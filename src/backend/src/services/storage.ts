import { Storage } from '@google-cloud/storage';
import { config } from '../config/index.js';
import { v4 as uuidv4 } from 'uuid';

class StorageService {
  private storage: Storage;
  private bucket: ReturnType<Storage['bucket']>;

  constructor() {
    this.storage = new Storage({
      projectId: config.gcs.projectId,
    });
    this.bucket = this.storage.bucket(config.gcs.bucketName);
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    folder: string
  ): Promise<string> {
    const ext = originalName.split('.').pop() || '';
    const filename = `${folder}/${uuidv4()}.${ext}`;
    
    const file = this.bucket.file(filename);
    await file.save(buffer, {
      contentType: this.getMimeType(ext),
      resumable: false,
    });

    await file.makePublic();
    return `https://storage.googleapis.com/${config.gcs.bucketName}/${filename}`;
  }

  async uploadAvatar(buffer: Buffer, address: string, originalName: string): Promise<string> {
    return this.uploadFile(buffer, originalName, `avatars/${address}`);
  }

  async uploadJobFile(buffer: Buffer, jobId: number, originalName: string): Promise<string> {
    return this.uploadFile(buffer, originalName, `jobs/${jobId}/attachments`);
  }

  async uploadSubmissionFile(buffer: Buffer, jobId: number, submissionId: number, originalName: string): Promise<string> {
    return this.uploadFile(buffer, originalName, `jobs/${jobId}/submissions/${submissionId}`);
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'txt': 'text/plain',
      'json': 'application/json',
      'zip': 'application/zip',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}

export const storageService = new StorageService();
