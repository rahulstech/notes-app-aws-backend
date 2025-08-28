import { QueueMessage } from './types';

export interface NoteQueueService {
  enqueueMessage(message: QueueMessage): Promise<void>;

  enqueuMultipleMessages(messages: QueueMessage[]): Promise<void>

  peekMultipleMessages(): Promise<QueueMessage[]>;

  removeMultipleMessages(messages: QueueMessage[]): Promise<void>;
}
