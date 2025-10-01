import { 
  QueueMessage, 
  QueueMessageEventType, 
  QueueMessageSourceType 
} from "@notes-app/queue-service";
import { NoteRepository } from "@note-app/note-repository";
import { AppError } from "@notes-app/common";
import { EventHandler, HandleEventOutput, HandleMessageOutput, MAX_ATTEMPT } from "../types";
import { createQueueServiceMessage, logAttemptExhausted } from "../helpers";

export class DeleteMediasHandler implements EventHandler {
  constructor(private noteRepository: NoteRepository) {}

  async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    const results: HandleMessageOutput[] = await Promise.all(messages.map(msg => this.processMessage(msg)));

    // Collapse into final result
    return results.reduce<HandleEventOutput>((acc, { consumed, requeue }) => {
        if (consumed) (acc.consumed ??= []).push(consumed);
        if (requeue) (acc.requeue ??= []).push(requeue);
        return acc;
    }, {});
  }

  private async processMessage(message: QueueMessage): Promise<HandleMessageOutput> {
    const { source_type, body } = message;
    const keys: string[] = source_type === QueueMessageSourceType.NOTE_SERVICE ? body.keys : body.content.keys;
    const attempt: number = source_type === QueueMessageSourceType.NOTE_SERVICE ? 1 : body.attempt;

    if (!Array.isArray(keys) || keys.length === 0) {
      return { consumed: message };
    }

    let requeue: QueueMessage | undefined;
    
    try {
      const { unsuccessful } = await this.noteRepository.deleteMediasByKey({
        keys,
      });
      if (unsuccessful?.length) {
        requeue = createQueueServiceMessage(QueueMessageEventType.DELETE_MEDIAS, { keys: unsuccessful }, attempt + 1);
      }
    } catch (err) {
      const repoError = err as AppError;
      if (repoError.operational && repoError.retriable) {
        // retry with same keys
        requeue = createQueueServiceMessage(QueueMessageEventType.DELETE_MEDIAS,{ keys },attempt + 1);
      }
    }

    if (requeue && attempt === MAX_ATTEMPT) {
      logAttemptExhausted({ keys }, "DeleteMediasHandler");
      requeue = undefined;
    }

    // Non-retriable or unexpected error → consume
    return { 
      consumed: message,
      requeue,
    };
  }
}
