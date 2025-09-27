import { 
    QueueMessage, 
    QueueMessageEventType,
    QueueMessageSourceType, 
} from "@notes-app/queue-service";
import { EventHandler, HandleEventOutput, HandleMessageOutput, MAX_ATTEMPT } from "../types";
import { NoteRepository } from "@note-app/note-repository";
import { AppError } from "@notes-app/common";
import { createQueueServiceMessage, logAttemptExhausted } from "../helpers";

export class DeleteNotesHandler implements EventHandler {
    constructor(private noteRepository: NoteRepository) {}

    public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
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
        const prefixes: string[] = source_type === QueueMessageSourceType.NOTE_SERVICE ? body.prefixes : body.content.prefixes;
        const attempt: number = source_type === QueueMessageSourceType.NOTE_SERVICE ? 1 : body.attempt;

        if (!Array.isArray(prefixes) || prefixes.length === 0) {
            return { consumed: message };
        }

        // Max attempts reached
        if (attempt >= MAX_ATTEMPT) {
            logAttemptExhausted({ prefixes }, "DeleteNotesHandler");
            return { consumed: message };
        }

        try {
            const { unsuccessful } = await this.noteRepository.deleteMediasByPrefixes({ 
                prefixes: prefixes as string[],
            });

            if (unsuccessful?.length) {
                // Some deletes failed → requeue only those
                return {
                    consumed: message,
                    requeue: createQueueServiceMessage(
                        QueueMessageEventType.DELETE_NOTES,
                        { prefixes: unsuccessful },
                        attempt + 1
                    )
                };
            }
        } catch (err) {
            const repoError = err as AppError;
            if (repoError.operational && repoError.retriable) {
                return {
                    consumed: message,
                    requeue: createQueueServiceMessage(
                        QueueMessageEventType.DELETE_NOTES,
                        { prefixes },
                        attempt + 1
                    )
                };
            }   
        }
        // Non-retriable or unexpected error → consume
        return { consumed: message };
    }
}
