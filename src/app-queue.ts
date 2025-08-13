import { QueueMessage, QueueMessageSourceType, NoteMedia, 
    NoteSQSQueueService, NoteDynamoDbDataService, NoteS3ObjectService, 
    QueueMessageEventType} from "./service";

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
    bucket: S3_BUCKET || '',
    mediaBaseUrl: MEDIA_CDN_URL_PREFIX || ''
})

const dataService = new NoteDynamoDbDataService(queueService)

async function handle(message: QueueMessage): Promise<boolean> {
    console.log("==============================================")
    console.log("received message ", message)

    const { source_type } = message

    if (source_type == QueueMessageSourceType.S3) {
        return handleS3Message(message)
    }
    else if (source_type == QueueMessageSourceType.NOTE_SERVICE) {
        return handleNoteServiceMessage(message)
    }

    return false
}


async function handleS3Message(message: QueueMessage): Promise<boolean> {
    // parse the queue message
    const object_key: string = message.body.object_key
    const segments: string[] = object_key.split("/")
    const user_id = segments[1]!
    const note_id = segments[2]!

    // object media metas like type, size etc
    const { mime_type, size } = await objectService.getMediaMeta(object_key)
    
    // create the NoteMedia object to add to db
    const media: NoteMedia = {
        url: new URL(object_key, MEDIA_CDN_URL_PREFIX).toString(),
        key: object_key,
        type: mime_type,
        size
    }

    // update the db note item with media item
    await dataService.setNoteMedias(note_id, user_id, [media])

    return true
}

async function handleNoteServiceMessage(message: QueueMessage): Promise<boolean> {
    const { event_type, body } = message

    if (event_type == QueueMessageEventType.DELETE_NOTE) {
        const { keys } = body
        await objectService.deleteMultipleMedias(keys)
        return true
    }

    return false
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