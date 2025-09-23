import {
NoteQueueService,
QueueMessage,
QueueMessageEventType,
} from '@notes-app/queue-service';
import { EventHandler, HandleEventOutput } from './types';
import { AppError, LOGGER } from '@notes-app/common';

export class App {
  constructor(
    private queueService: NoteQueueService,
    private handlers: Record<QueueMessageEventType, EventHandler>
  ) {}

  private mapByEventType(messages: QueueMessage[]) {
    return messages.reduce((acc, message) => {
      (acc[message.event_type] ??= []).push(message);
      return acc;
    }, {} as Record<QueueMessageEventType, QueueMessage[]>);
  }

  async handleMessages(messages: QueueMessage[]) {
    if (messages.length === 0) return;

    const mapped = this.mapByEventType(messages);

    try {
      const outputs = await Promise.all(
        Object.entries(mapped).map(([eventType, msgs]) =>
          this.handlers[eventType as QueueMessageEventType].handle(msgs)
        )
      );
  
      const { consumed, requeue } = outputs.reduce<HandleEventOutput>(
        (acc, { consumed, requeue }) => {
          if (consumed) (acc.consumed ??= []).push(...consumed);
          if (requeue) (acc.requeue ??= []).push(...requeue);
          return acc;
        },
        {});
  
      if (consumed?.length) {
        await this.queueService.removeMultipleMessages(consumed);
      }
      if (requeue?.length) {
        await this.queueService.enqueuMultipleMessages(requeue);
      }
    }
    catch(error) {
      LOGGER.logFatal('handleMessages', { tag: 'App' });
      if (error instanceof AppError) {
        if (!error.operational) {
          process.exit(1); // TODO: change exit code
        }
      }
      else {
        throw error;
      }
    }
  }
}
