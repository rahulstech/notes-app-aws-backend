import {
NoteQueueService,
QueueMessage,
QueueMessageEventType,
} from '@notes-app/queue-service';
import { EventHandlerRegistry, HandleEventOutput, QueueAppConfig } from './types';
import { AppError, LOGGER } from '@notes-app/common';

const LOG_TAG = "QueueApp";

export class QueueApp {
  private queueService: NoteQueueService;
  private handlers: EventHandlerRegistry;

  constructor(
    config: QueueAppConfig
  ) {
    this.queueService = config.queueFactory.createNoteQueueService();
    this.handlers = config.handlers;
  }

  private mapByEventType(messages: QueueMessage[]): Record<QueueMessageEventType,QueueMessage[]> {
    return messages.reduce((acc, message) => {
      (acc[message.event_type] ??= []).push(message);
      return acc;
    }, {} as Record<QueueMessageEventType, QueueMessage[]>);
  }

  public async handleMessages(messages: QueueMessage[]): Promise<void> {
    if (messages.length === 0) return;

    const mapped = this.mapByEventType(messages);
    try {
      const outputs = await Promise.all(
        Object.entries(mapped).map(([eventType, msgs]) => {
          return this.handlers[eventType as QueueMessageEventType].handle(msgs);
        })
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
      LOGGER.logFatal(error, { tag: 'QueueApp', method: 'handleMessages' });
      const shouldExit = error instanceof AppError ? error.operational : true;
      if (shouldExit) {
        process.exit(1);
      }
    }
  }
}
