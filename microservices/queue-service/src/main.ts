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

async function handle(message: QueueMessage): Promise<boolean> {
  console.log('==============================================');
  console.log('received message ', message);

  const { source_type } = message;

  if (source_type == QueueMessageSourceType.S3) {
    return handleS3Message(message);
  } else if (source_type == QueueMessageSourceType.NOTE_SERVICE) {
    return handleNoteServiceMessage(message);
  }

  return false;
}

async function handleS3Message(message: QueueMessage): Promise<boolean> {
  // parse the queue message
  const object_key: string = message.body.object_key;
  const segments: string[] = object_key.split('/');
  const user_id = segments[1]!;
  const note_id = segments[2]!;

  const key_status: Record<string, NoteMediaStatus> = {};
  key_status[object_key] = NoteMediaStatus.AVAILABLE;

  // update the db note item with media item
  await dataService.updateMediaStatus(note_id, user_id, key_status);

  return true;
}

async function handleNoteServiceMessage(
  message: QueueMessage
): Promise<boolean> {
  const { event_type, body } = message;

  if (event_type == QueueMessageEventType.DELETE_MEDIAS) {
    const { keys } = body;
    await objectService.deleteMultipleObjects(keys);
    return true;
  }

  return false;
}

async function main() {
  // TODO: need to manage messages in batch
  while (true) {
    const queuMessages = await queueService.peekMultipleMessages();
    if (queuMessages.length == 0) {
      continue;
    }
    const promises = queuMessages.map((message) => handle(message));
    const results = await Promise.all(promises);
    const removeMessages = queuMessages.filter((_, index) => results[index]);
    await queueService.removeMultipleMessages(removeMessages);
  }
}

(async () => {
  console.log('starting queue service');
  await main();
})();
