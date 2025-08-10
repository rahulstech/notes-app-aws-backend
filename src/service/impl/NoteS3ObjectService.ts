import NoteObjectService, { MediaUploadUrl, MediaUploadUrlOptions } from "../NoteObjectService";
import MediaObjectEntry from "../model/MediaObjectEntry";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from "node:crypto";

const MEDIA_URL_EXPIRES_IN = 900 // 15 minutes

export interface S3ClientOptions {
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    bucket: string
}

export default class NoteS3ObjectService implements NoteObjectService {

    private client: S3Client
    private bucket: string

    constructor(options: S3ClientOptions) {
        this.bucket = options.bucket
        this.client = new S3Client({
            region: options.region,
            credentials: {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey
            }
        })
    }

    public async getMediaUploadUrl(options: MediaUploadUrlOptions): Promise<MediaUploadUrl> {
        const { user_id, note_id, media_type, media_size } = options 
        const Key = this.createMediaObjectKey(user_id,note_id)
        const cmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key,
            ContentType: media_type,
            ContentLength: media_size,
        })
        const url = await getSignedUrl(this.client, cmd, {
            expiresIn: MEDIA_URL_EXPIRES_IN
        })
        const output = {
            url,
            method: 'PUT',
            expires: Date.now()+MEDIA_URL_EXPIRES_IN,
            expires_in: MEDIA_URL_EXPIRES_IN,
        }
        return Promise.resolve(output)
    }

    private createMediaObjectKey(user_id: string, note_id: string): string {
        return `medias/${user_id}/${note_id}/${randomUUID()}`
    }

    public async getMediaMeta(key: string): Promise<MediaObjectEntry> {
        const cmd = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key
        })

        const { ContentLength, ContentType } = await this.client.send(cmd)
        const entry = {
            key,
            media_type: ContentType!,
            media_size: ContentLength!
        }
        return Promise.resolve(entry)
    }
}