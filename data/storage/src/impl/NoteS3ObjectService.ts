import {
  NoteObjectService,
  
} from '../NoteObjectService';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import {} from '@notes-app/common';
import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from '../types';

const PRESIGNED_URL_EXPIRES_IN = 900; // 15 minutes

const PRESIGNED_URL_EXPIRES_IN_MILLIS = PRESIGNED_URL_EXPIRES_IN * 1000;

export interface S3ClientOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  mediaBaseUrl: string;
}

export class NoteS3ObjectService implements NoteObjectService {
  private client: S3Client;
  private bucket: string;
  private mediaBaseUrl: string;

  constructor(options: S3ClientOptions) {
    this.mediaBaseUrl = options.mediaBaseUrl;
    this.bucket = options.bucket;
    this.client = new S3Client({
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    });
  }

  public async getObjectUploadUrl(
    input: ObjectUploadUrlInput
  ): Promise<ObjectUploadUrlOutput> {
    const { key: Key, mime_type, size, expires_in } = input;
    const expiresIn = expires_in ? expires_in : PRESIGNED_URL_EXPIRES_IN;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key,
      ContentType: mime_type,
      ContentLength: size
    });
    const url = await getSignedUrl(this.client, cmd, { expiresIn });
    return {
      url,
      http_method: 'PUT',
      expire: Math.floor(Date.now()/1000) + expiresIn,
      expires_in: expiresIn,
    };
  }

  public createMediaObjectKey(user_id: string, note_id: string): string {
    return `medias/${user_id}/${note_id}/${randomUUID()}`;
  }

  public getMediaUrl(key: string): string {
    return new URL(key, this.mediaBaseUrl).toString();
  }

  public async deleteMultipleObjects(keys: string[]): Promise<void> {
    const cmd = new DeleteObjectsCommand({
      Bucket: this.bucket,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
      },
    });

    await this.client.send(cmd);
  }
}
