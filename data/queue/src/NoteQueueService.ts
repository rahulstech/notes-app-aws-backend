import { QueueMessage, RawQueueMessage } from './types';

export interface NoteQueueService {
  enqueueMessage(message: QueueMessage): Promise<void>;

  enqueuMultipleMessages(messages: QueueMessage[]): Promise<void>

  peekMultipleMessages(): Promise<QueueMessage[]>;

  parseRawMessage(message: RawQueueMessage): QueueMessage;

  removeMultipleMessages(messages: QueueMessage[]): Promise<void>;
}
