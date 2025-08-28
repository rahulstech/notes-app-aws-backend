import {
  NoteDynamoDbDataService,
  NoteMediaStatus,
} from '@notes-app/database-service';
import {
  NoteSQSQueueService,
  QueueMessage,
  QueueMessageEventType,
  QueueMessageSourceType,
} from '@notes-app/queue-service';
import { NoteS3ObjectService } from '@notes-app/storage-service';
import { NoteRepositoryImpl, splitNoteMediaKey } from '@note-app/note-repository'
import { HandleEventOutput } from './types';

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  SQS_REGION,
  SQS_URL,
  S3_REGION,
  S3_BUCKET,
  MEDIA_CDN_URL_PREFIX,
  MAX_ALLOWED_MEDIAS_PER_NOTE
} = process.env;

const queueService = new NoteSQSQueueService({
  region: SQS_REGION || '',
  accessKeyId: AWS_ACCESS_KEY_ID || '',
  secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  queueUrl: SQS_URL || '',
});

const objectService = new NoteS3ObjectService({
  region: S3_REGION || '',
  accessKeyId: AWS_ACCESS_KEY_ID || '',
  secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  bucket: S3_BUCKET || '',
  mediaBaseUrl: MEDIA_CDN_URL_PREFIX || '',
});

const dataService = new NoteDynamoDbDataService({
  maxMediasPerItem: Number(MAX_ALLOWED_MEDIAS_PER_NOTE || 5)
});

const noteRepository = new NoteRepositoryImpl({
  databaseService: dataService, queueService, storageService: objectService
})

async function handleDeleteNotesEvent(message: QueueMessage[]): Promise<HandleEventOutput> {
  const outputs = await Promise.all(message.map(async (message) => {
    try {
      const keys = await objectService.getKeysByPrefix(message.body.prefix)
      return { keys, message }
    }
    catch(error) {
      console.log(error) // TODO: remove log
      return {}
    }
  }))

  const consumed: QueueMessage[] = []
  let allKeys: string[] = []
  outputs.forEach(({keys,message}) => {
    if (keys) {
      allKeys = allKeys.concat(keys)
      consumed.push(message)
    }
  })

  let requeue: QueueMessage[] | undefined
  if (allKeys.length > 0) {
    const failedKeys = await objectService.deleteMultipleObjects(allKeys)
    requeue = [{
      source_type: QueueMessageSourceType.QUEUE_SERVICE,
      event_type: QueueMessageEventType.DELETE_MEDIAS,
      body: { keys: failedKeys }
    }]
  }

  return { consumed, requeue }
}

async function handleDeleteMediasEvent(messages: QueueMessage[]): Promise<HandleEventOutput> {
  const consumed = (await Promise.all(messages.map(async (message) => {
      const { keys } = message.body
      try {
        await objectService.deleteMultipleObjects(keys)
        return message
      }
      catch(error) {
        console.log(error) // TODO: remove log
      }
      return null
    }))
  ).filter(value => value !== null)

  return { consumed }
}

async function handleCreateObjectEvent(message: QueueMessage[]): Promise<HandleEventOutput> {
  const consumed = (await Promise.all(message.map(async (message) => {
      const { key } = message.body;
      const { user_id, note_id } = splitNoteMediaKey(key)
      try {
        // update the db note item with media item
        await noteRepository.updateMediaStatus({ 
          user_id, 
          medias: { 
            [note_id]: [
              { key, status: NoteMediaStatus.AVAILABLE }
            ]
        }});
        return message
      }
      catch(error) {
        console.log(error) // TODO: remove log
      }
      return null
    }))
  ).filter(value => value !== null)
  
  return { consumed }
}

function mapByEventType(messages: QueueMessage[]): Record<QueueMessageEventType, QueueMessage[]>{
  return messages.reduce((acc,message)=>{
    const event_type = message.event_type
    if (!acc[event_type]) {
      acc[event_type] = []
    }
    acc[event_type].push(message)
    return acc
  },{} as Record<QueueMessageEventType, QueueMessage[]>)
}

async function handleEvent(event_type: QueueMessageEventType, messages: QueueMessage[]): Promise<HandleEventOutput> {
  switch(event_type) {
    case QueueMessageEventType.DELETE_NOTES: return await handleDeleteNotesEvent(messages)
    case QueueMessageEventType.DELETE_MEDIAS: return await handleDeleteMediasEvent(messages)
    case QueueMessageEventType.CREATE_OBJECT: return await handleCreateObjectEvent(messages)
    default: []
  }
}

async function main() {
  while (true) {
    const queuMessages = await queueService.peekMultipleMessages();
    if (queuMessages.length == 0) {
      continue;
    }

    const sorted = mapByEventType(queuMessages)
    const outputs: HandleEventOutput[]
          = await Promise.all(Object.entries(sorted)
                                      .map(async ([event_type,messages]) => handleEvent(QueueMessageEventType[event_type],messages)))

    const { consumed, requeue } = outputs.reduce<HandleEventOutput>((acc,{consumed,requeue}) => {
      if (consumed) {
        if (!acc.consumed) {
          acc.consumed = []
        }
        acc.consumed = acc.consumed.concat(consumed)
      }
      if (requeue) {
        if (!acc.requeue) {
          acc.requeue = []
        }
        acc.requeue = acc.requeue.concat(requeue)
      }
      return acc
    },{})

    if (consumed && consumed.length > 0) {
      await queueService.removeMultipleMessages(consumed);
    }

    if (requeue && requeue.length > 0) {
      await queueService.enqueuMultipleMessages(requeue);
    }
  }
}

(async () => {
  console.log('starting queue service');
  await main();
})();
