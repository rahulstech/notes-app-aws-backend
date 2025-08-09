import { MediaPutUrlOptions, MediaPutUrlOutput, NoteObjectService } from "../NoteObjectService";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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

    public async getMediaPutUrl(options: MediaPutUrlOptions): Promise<MediaPutUrlOutput> {
        const cmd = new PutObjectCommand({
            Bucket: this.bucket,
            Key: options.media_key,
            ContentType: options.media_type,
            ContentLength: options.media_size
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
}