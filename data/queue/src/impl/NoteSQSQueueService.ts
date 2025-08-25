import {
  DeleteMessageBatchCommand,
  Message,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { randomUUID } from 'node:crypto';
import { NoteQueueService } from '../NoteQueueService';
import {
  QueueMessage,
  QueueMessageEventType,
  QueueMessageSourceType,
} from '../model/QueueMessage';

const DEFAULT_DEQUEUE_POLL_SECONDS = 20;

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
    const { source_type, event_type, body } = message;
    const MessageBody = JSON.stringify({
      event_type,
      body,
    });
    const cmd = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody,

      // message attributes are the user defined attributes for the message
      MessageAttributes: {
        source_type: {
          DataType: 'String',
          StringValue: source_type,
        },
      },
    });

    await this.client.send(cmd);
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
    if (Messages) {
      const queuMessages = Messages.map((Message) =>
        this.createQueueMessage(Message)
      );
      return Promise.resolve(queuMessages);
    }

    return Promise.resolve([]);
  }

  private createQueueMessage(message: Message): QueueMessage {
    const { Body, MessageAttributes, ReceiptHandle } = message;

    const source_type = MessageAttributes?.source_type
      ? QueueMessageSourceType.NOTE_SERVICE
      : QueueMessageSourceType.S3;
    if (source_type == QueueMessageSourceType.S3) {
      const { Records } = JSON.parse(Body!);
      const record = Records[0];

      const { bucket, object } = record.s3;
      const bucket_name = bucket.name;
      const object_key = object.key;
      return {
        source_type,
        event_type: QueueMessageEventType.CREATE_OBJECT,
        body: { bucket_name, object_key },
        receipt_handle: ReceiptHandle!,
      };
    } else {
      const { event_type, body } = JSON.parse(Body!);
      return {
        source_type,
        event_type,
        body,
        receipt_handle: ReceiptHandle!,
      };
    }
  }

  public async removeMultipleMessages(messages: QueueMessage[]): Promise<void> {
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
