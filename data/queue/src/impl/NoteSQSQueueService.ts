import {
  DeleteMessageBatchCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { NoteQueueService } from '../NoteQueueService';
import {
  QueueMessage,
  QueueMessageEventType,
  QueueMessageSourceType,
  RawQueueMessage,
} from '../types';
import { convertSQSError } from '../errors';
import { getEventType, getSourceType } from '../helpers';
import { LOGGER } from '@notes-app/common';

const LOG_TAG = "NoteSQSQueueService";
const DEFAULT_DEQUEUE_POLL_SECONDS = 20; // must be between 0 and 20 seconds
const DEFAULT_MESSAGE_VISIBILITY_TIMEOUT_SECONDS = 30; // must be between 0 seconds and 12 hours

function parseMessageBody(source_type: QueueMessageSourceType, event_type: QueueMessageEventType,rawBody: any): any {
  if (source_type === QueueMessageSourceType.S3 && event_type === QueueMessageEventType.CREATE_OBJECT) {
    // AWS S3 event body is located inside Records[0].s3
    return {
      bucket: rawBody.bucket?.name,
      key: rawBody.object?.key,
    }
  }
  // Fallback: return the raw body as-is
  return rawBody;
}

export interface NoteSQSQueueServiceOptions {
  queueUrl: string;
  messageVisibilityTimeoutSeconds?: number;
  client: SQSClient;
}

export class NoteSQSQueueService implements NoteQueueService {
  private client: SQSClient;
  private messageVisibilityTimeoutSeconds: number;
  private queueUrl: string;

  constructor(options: NoteSQSQueueServiceOptions) {
    this.client = options.client;
    this.messageVisibilityTimeoutSeconds = options.messageVisibilityTimeoutSeconds ?? DEFAULT_MESSAGE_VISIBILITY_TIMEOUT_SECONDS;
    this.queueUrl = options.queueUrl;
  }

  /**
   * Enqueue a single message into the SQS queue.
   * If SQS rejects the request (due to invalid content, throttling, or other errors),
   * the raw AWS error is converted into a consistent AppError before being thrown.
   */
  public async enqueueMessage(message: QueueMessage): Promise<void> {
    try {
      await this.client.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(message),
        })
      );
    } catch (error) {
      throw convertSQSError(error,{tag:LOG_TAG,method:"enqueueMessage"});
    }
  }

  /**
   * Enqueue multiple messages in a single batch call.
   * Batch operations can fail partially: some messages may succeed while others fail.
   * In case of error, the failure is wrapped into an AppError to make handling consistent.
   */
  public async enqueuMultipleMessages(messages: QueueMessage[]): Promise<void> {
    try {
      const Entries = messages.map((message, index) => ({
        Id: `send-message${index}`,
        MessageBody: JSON.stringify(message),
      }));
      await this.client.send(
        new SendMessageBatchCommand({
          QueueUrl: this.queueUrl,
          Entries,
        })
      );
    } catch (error) {
      throw convertSQSError(error,{tag:LOG_TAG,method:"enqueueMultipleMessages"});
    }
  }

  /**
   * Poll the queue for up to 10 messages, waiting up to pollSeconds (default 20s).
   * Long polling reduces empty responses and unnecessary API calls.
   * Any errors during polling (like QueueDoesNotExist, InternalError) are normalized.
   */
  public async peekMultipleMessages(): Promise<QueueMessage[]> {
    try {
      const cmd = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        // message will not be available to other consumer if received by a consumer untill visibility timesout
        VisibilityTimeout: this.messageVisibilityTimeoutSeconds,
        WaitTimeSeconds: DEFAULT_DEQUEUE_POLL_SECONDS,
        MaxNumberOfMessages: 10,
        // By default, SQS does not return message attributes unless explicitly requested.
        // "All" is a keyword that requests all attributes.
        // MessageAttributeNames: ['All'],
      });

      const { Messages } = await this.client.send(cmd);
      return Messages?.map(this.parseRawMessage) ?? [];
    } catch (error) {
      throw convertSQSError(error,{tag:LOG_TAG,method:"peekMultipleMessages"});
    }
  }

  /**
   * Converts an AWS SQS message into our internal QueueMessage representation.
   * Handles both raw AWS S3 event payloads and normalized events produced by our services.
   */
  public parseRawMessage(message: RawQueueMessage): QueueMessage {
    const { Body, ReceiptHandle } = message;
    if (!Body) {
      return {
        source_type: QueueMessageSourceType.UNKNOWN,
        event_type: QueueMessageEventType.UNKNOWN,
        receipt_handle: ReceiptHandle,
      };
    }

    LOGGER.logDebug('parse raw message', { tag: LOG_TAG, method: "parseRawMessage", message: Body });

    try {
      let rawSource: string = QueueMessageSourceType.UNKNOWN;
      let rawEvent: string = QueueMessageEventType.UNKNOWN;
      let rawBody: any | undefined;

      const parsed = JSON.parse(Body);

      // Case 1: S3 event from AWS (nested inside Records array)
      if (parsed.Records !== undefined && Array.isArray(parsed.Records) && parsed.Records.length > 0) {
        const rec = parsed.Records[0];
        rawSource = rec.eventSource;
        rawEvent = rec.eventName;
        rawBody = rec.s3 ?? {};
      }
      // Case 2: Pre-normalized event produced by another service
      else if (parsed.source_type !== undefined && parsed.event_type !== undefined) {
        rawSource = parsed.source_type;
        rawEvent = parsed.event_type;
        rawBody = parsed.body ?? {};
      }

      const source_type = getSourceType(rawSource);
      const event_type = getEventType(rawEvent);
      const body = parseMessageBody(source_type, event_type, rawBody);
      return {
        source_type,
        event_type,
        body,
        receipt_handle: ReceiptHandle,
      };
    }
    catch(error) {
      LOGGER.logWarn(error, { tag: LOG_TAG, method: "parseMessage" });
    }

    return {
      source_type: QueueMessageSourceType.UNKNOWN,
      event_type: QueueMessageEventType.UNKNOWN,
      body: Body,
      receipt_handle: ReceiptHandle,
    }
  }

  /**
   * Removes multiple messages from the queue after they have been processed.
   * If a receipt handle is invalid or expired, the error is caught and normalized.
   */
  public async removeMultipleMessages(messages: QueueMessage[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    try {
      const Entries = messages.map((message,index) => ({
        Id: `delete-message${index}`,
        ReceiptHandle: message.receipt_handle,
      }));
      const cmd = new DeleteMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries,
      });
      await this.client.send(cmd);
    } catch (error) {
      throw convertSQSError(error,{tag:LOG_TAG,method:"removeMultilpleMessages"});
    }
  }
}