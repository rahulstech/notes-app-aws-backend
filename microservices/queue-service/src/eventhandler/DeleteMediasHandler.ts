import { QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";
import { NoteRepository } from "@note-app/note-repository";
import { AppError, LOGGER } from "@notes-app/common";
import { EventHandler, HandleEventOutput, MAX_ATTEMPT } from "../types";

export class DeleteMediasHandler implements EventHandler {
  
  constructor(private noteRepository: NoteRepository) {}

  async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    LOGGER.logInfo('handle delete medias',{
        tag: 'DeleteMediasHandler',
        'queue-messages': messages
    });
    const results: {consumed?: QueueMessage; requeue?: QueueMessage }[] = (
      await Promise.all(messages.map(async (message) => {
        try {
          const { keys, attempt } = message.body;
          if (message.source_type === QueueMessageSourceType.QUEUE_SERVICE && attempt === MAX_ATTEMPT) {
            return {consumed: message};
          }

          const { unsuccessful } = await this.noteRepository.deleteMediasByKey(message.body.keys);
          if (unsuccessful && unsuccessful.length > 0) {
            return {
              consumed: message,
              requeue: this.createMessageForUnsuccessfulDelete(unsuccessful,attempt===undefined ? 1 : attempt+1),
            }
          }
          else {
            return { consumed: message };
          }
        } 
        catch (error) {
          LOGGER.logInfo(error, "DeleteMediasHandler");
          const repoerror = error as AppError;
          if (!repoerror.retriable) {
            return { consumed: message };
          }
        }
        return {};
      }))
    );

    const allConsumed: QueueMessage[] = [];
    const allRequeue: QueueMessage[] = [];
    results.forEach(({consumed,requeue}) => {
      if (consumed) allConsumed.push(consumed);
      if (requeue) allRequeue.push(requeue);
    });

    return {
      consumed: allConsumed.length > 0 ? allConsumed : undefined,
      requeue: allRequeue.length > 0 ? allRequeue : undefined,
    }
  }

  private createMessageForUnsuccessfulDelete(keys: string[], attempt: number = 1): QueueMessage {
    return {
        source_type: QueueMessageSourceType.QUEUE_SERVICE,
        event_type: QueueMessageEventType.DELETE_MEDIAS,
        body: { keys, attempt }
    }
}
}