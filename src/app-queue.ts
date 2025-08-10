import { QueueMessage, QueueMessageSourceType, NoteMedia, 
    NoteSQSQueueService, NoteDynamoDbDataService, NoteS3ObjectService } from "./service";

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, SQS_REGION, SQS_URL,
     S3_REGION, S3_BUCKET, MEDIA_CDN_URL_PREFIX } = process.env

const queueService = new NoteSQSQueueService({
    region: SQS_REGION || '',
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    queueUrl: SQS_URL || ''
})

const objectService = new NoteS3ObjectService({
    region: S3_REGION || '',
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    bucket: S3_BUCKET || ''
})

const dataService = new NoteDynamoDbDataService()

async function handle(message: QueueMessage): Promise<boolean> {
    console.log("==============================================")
    console.log("received message ", message)

    const { source_type, body } = message

    if (source_type == QueueMessageSourceType.S3) {
        // parse the queue message
        const object_key: string = body.object_key
        const segments: string[] = object_key.split("/")
        const user_id = segments[1]!
        const note_id = segments[2]!

        // object media metas like type, size etc
        const { media_type, media_size } = await objectService.getMediaMeta(object_key)
        
        // create the NoteMedia object to add to db
        const media: NoteMedia = {
            url: new URL(object_key, MEDIA_CDN_URL_PREFIX).toString(),
            key: object_key,
            type: media_type,
            size: media_size
        }

        // update the db note item with media item
        await dataService.setNoteMedias(note_id, user_id, [media])

        return Promise.resolve(true)
    }
    
    return Promise.resolve(false)
}

async function main() {
    // TODO: need to manage messages in batch
    while(true) {
        const queuMessages = await queueService.peekMultipleMessages()
        if (queuMessages.length == 0) {
            continue
        }
        const promises = queuMessages.map(message => handle(message))
        const results = await Promise.all(promises)
        const removeMessages = queuMessages.filter((_, index) => results[index])
        await queueService.removeMultipleMessages(removeMessages)
    }
}

(async () => {
    console.log("starting queue service")
    await main()
})()