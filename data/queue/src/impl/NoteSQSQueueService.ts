import {
  DeleteMessageBatchCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { NoteQueueService } from '../NoteQueueService';
import {
  QueueMessage,
  QueueMessageEventType,
  QueueMessageSourceType,
} from '../types';

const DEFAULT_DEQUEUE_POLL_SECONDS = 20;

const sourceLookup: Record<string, QueueMessageSourceType> = {
  "aws:s3": QueueMessageSourceType.S3,
  "NOTE_SERVICE": QueueMessageSourceType.NOTE_SERVICE,
  "QUEUE_SERVICE": QueueMessageSourceType.QUEUE_SERVICE,
};

const eventLookup: Record<string, QueueMessageEventType> = {
  "ObjectCreated:Put": QueueMessageEventType.CREATE_OBJECT,
  "ObjectCreated:Post": QueueMessageEventType.CREATE_OBJECT,
  "ObjectCreated:CompleteMultipartUpload": QueueMessageEventType.CREATE_OBJECT,
  "DELETE_NOTES": QueueMessageEventType.DELETE_NOTES,
  "DELETE_MEDIAS": QueueMessageEventType.DELETE_MEDIAS,
};

function getSourceType(raw?: string): QueueMessageSourceType {
  if (!raw) return QueueMessageSourceType.UNKNOWN;
  return sourceLookup[raw] ?? QueueMessageSourceType.UNKNOWN;
}

function getEventType(raw?: string): QueueMessageEventType {
  if (!raw) return QueueMessageEventType.UNKNOWN;
  return eventLookup[raw] ?? QueueMessageEventType.UNKNOWN;
}

function parseMessageBody(
  source_type: QueueMessageSourceType,
  event_type: QueueMessageEventType,
  rawBody: any
): any {
  switch (source_type) {
    case QueueMessageSourceType.S3:
      if (event_type === QueueMessageEventType.CREATE_OBJECT) {
        // AWS S3 event body is in Records[0].s3
        return {
          bucket: rawBody.bucket.name,
          key: rawBody.object.key,
        }
      }
  }

  // Default fallback
  return rawBody;
}

export interface SQSClientOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  queueUrl: string;
  pollSeconds?: number;
}

export class NoteSQSQueueService implements NoteQueueService {
  private client: SQSClient;
  private pollSeconds: number;
  private queueUrl: string;

  constructor(options: SQSClientOptions) {
    const { region, accessKeyId, secretAccessKey, pollSeconds, queueUrl } =
      options;
    this.client = new SQSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.pollSeconds = pollSeconds || DEFAULT_DEQUEUE_POLL_SECONDS;
    this.queueUrl = queueUrl;
  }

  public async enqueueMessage(message: QueueMessage): Promise<void> {
    const cmd = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message)
    });

    await this.client.send(cmd);
  }

  public async enqueuMultipleMessages(messages: QueueMessage[]): Promise<void> {
    const cmd = new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: messages.map(message => ({ Id: undefined, MessageBody: JSON.stringify(message)}))
    })
    
    await this.client.send(cmd)
  }

  public async peekMultipleMessages(): Promise<QueueMessage[]> {
    const cmd = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      WaitTimeSeconds: this.pollSeconds,
      MaxNumberOfMessages: 10,

      // without explicitly mentioning this property the message attributes will not be returned even if exists.
      // All is a keyword which means i need all the attributes. otherwise i can request message attributes by name.
      MessageAttributeNames: ['All'],
    });

    const { Messages } = await this.client.send(cmd);
    return Messages?.map(this.parseSqsMessage) ?? [];
  }

  private parseSqsMessage(message: Message): QueueMessage {
    const { Body, ReceiptHandle } = message;
    if (!Body) {
      return {
        source_type: QueueMessageSourceType.UNKNOWN,
        event_type: QueueMessageEventType.UNKNOWN
      }
    }
  
    let rawSource: string = QueueMessageSourceType.UNKNOWN;
    let rawEvent: string = QueueMessageEventType.UNKNOWN;
    let rawBody: any | undefined;
  
    const parsed = JSON.parse(Body);
  
    // --- Case 1: S3 event (inside Records[])
    if ("Records" in parsed && Array.isArray(parsed.Records) && parsed.Records.length > 0) {
      const rec = parsed.Records[0];
      rawSource = rec.eventSource;
      rawEvent = rec.eventName;
      rawBody = rec.s3 ?? {};
    }

    // --- Case 2: Already-normalized event
    else if ("source_type" in parsed && "event_type" in parsed) {
      rawSource = parsed.source_type;
      rawEvent = parsed.event_type;
      rawBody = parsed.body ?? {};
    }

    const source_type = getSourceType(rawSource)
    const event_type = getEventType(rawEvent)
    const body = parseMessageBody(source_type,event_type,rawBody)
  
    return {
      source_type,
      event_type,
      body,
      receipt_handle: ReceiptHandle,
    };
  }

  public async removeMultipleMessages(messages: QueueMessage[]): Promise<void> {
    if (messages.length === 0) {
      return
    }
    const Entries = messages.map((message) => ({
      Id: randomUUID(),
      ReceiptHandle: message.receipt_handle,
    }));
    const cmd = new DeleteMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries,
    });

    await this.client.send(cmd);
  }
}
