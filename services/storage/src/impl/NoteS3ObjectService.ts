import { NoteObjectService, MediaObject, MediaUploadUrlInput, MediaUploadUrlOutput } from "../NoteObjectService";
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from "node:crypto";
import { } from '@notes-app/common'

const PRESIGNED_URL_EXPIRES_IN = 900 // 15 minutes

const PRESIGNED_URL_EXPIRES_IN_MILLIS = PRESIGNED_URL_EXPIRES_IN * 1000

export interface S3ClientOptions {
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    bucket: string,
    mediaBaseUrl: string
}

export class NoteS3ObjectService implements NoteObjectService {

    private client: S3Client
    private bucket: string
    private mediaBaseUrl: string

    constructor(options: S3ClientOptions) {
        this.mediaBaseUrl = options.mediaBaseUrl
        this.bucket = options.bucket
        this.client = new S3Client({
            region: options.region,
            credentials: {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey
            }
        })
    }

    public async getMediaUploadUrl(input: MediaUploadUrlInput): Promise<MediaUploadUrlOutput> {
        const { id, key: Key, mime_type, size } = input
        const Expires = new Date(Date.now() + PRESIGNED_URL_EXPIRES_IN_MILLIS)
        const cmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key,
            ContentType: mime_type,
            ContentLength: size,
            // Expires
        })
        const upload_url = await getSignedUrl(this.client, cmd)
        return { id, upload_url, upload_http_method: 'PUT', expire: Expires.getTime(), expires_in: PRESIGNED_URL_EXPIRES_IN_MILLIS }
    }

    public createMediaObjectKey(user_id: string, note_id: string): string {
        return `medias/${user_id}/${note_id}/${randomUUID()}`
    }

    public async getMediaMeta(key: string): Promise<MediaObject> {
        const cmd = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key
        })

        const { ContentLength, ContentType } = await this.client.send(cmd)
        const entry = {
            key,
            mime_type: ContentType!,
            size: ContentLength!
        }
        return entry
    }

    public getMediaUrl(key: string): string {
        return new URL(key, this.mediaBaseUrl).toString()
    }

    public async deleteMultipleMedias(keys: string[]): Promise<void> {
        const cmd = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
                Objects: keys.map(Key => ({Key}))
            }
        })

        await this.client.send(cmd)
    }
}