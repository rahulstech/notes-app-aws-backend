import {
  NoteObjectService,
} from '../NoteObjectService';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from '../types';
import { convertS3Error } from '../errors';
import { LOGGER } from '@notes-app/common';

const LOG_TAG = 'NoteS3ObjectService';

const PRESIGNED_URL_EXPIRES_IN = 900; // 15 minutes

export interface NoteS3ObjectServiceOptions {
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

  constructor(options: NoteS3ObjectServiceOptions) {
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

  public async getObjectUploadUrl(input: ObjectUploadUrlInput): Promise<ObjectUploadUrlOutput> {
    const { key: Key, mime_type, size, expires_in } = input;
    const expiresIn = expires_in ? expires_in : PRESIGNED_URL_EXPIRES_IN;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key,
      ContentType: mime_type,
      ContentLength: size
    });
    try {
      const upload_url = await getSignedUrl(this.client, cmd, { expiresIn });
      return {
        upload_url,
        upload_http_method: 'PUT',
        expire: Math.floor(Date.now()/1000) + expiresIn,
        expires_in: expiresIn,
      }
    }
    catch(error) {
      throw convertS3Error(error)
    }
  }

  public getMediaUrl(key: string): string {
    return new URL(key, this.mediaBaseUrl).toString();
  }

  public async deleteMultipleObjects(keys: string[]): Promise<string[]> {
    try {
      const { Errors } = await this.client.send(new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
        },
      }));
      return Errors?.reduce<string[]>((acc,{Key}) => {
        if (Key) {
          acc.push(Key);
        }
        return acc;
      },[]) ?? [];
    }
    catch(error) {
      throw convertS3Error(error);
    }
  }

  public async deleteObjectByPrefix(prefix: string): Promise<void> {
    let keys: string[] = await this.getKeysByPrefix(prefix);

    let attemptLeft = 3;
    while(keys.length > 0 && attemptLeft > 0) {
      keys = await this.deleteMultipleObjects(keys);
      attemptLeft--;
    }
  }

  private async getKeysByPrefix(prefix: string): Promise<string[]> {
    LOGGER.logInfo('getKeysByPrefix', { tag: LOG_TAG, prefix });
    try {
      const { Contents } = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix
      }))
      const keys = Contents?.map(value => value.Key!) ?? [];
      return keys;
    }
    catch(error) {
      throw convertS3Error(error);
    }
  }
}
