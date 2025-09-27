import { 
    QueueMessage, 
    QueueMessageEventType, 
    QueueMessageSourceType 
} from "@notes-app/queue-service";
import { EventHandler, HandleEventOutput, HandleMessageOutput, MAX_ATTEMPT } from "../types";
import { NoteRepository } from "@note-app/note-repository";
import { AppError, LOGGER } from "@notes-app/common";
import { createQueueServiceMessage, logAttemptExhausted } from "../helpers";

export class DeleteUserHandler implements EventHandler {
    constructor(private noteRepository: NoteRepository) {}

    public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
        LOGGER.logInfo("received DELETE_USER events", { tag: "DeleteUserHandler", count: messages.length });

        const results: HandleMessageOutput[] = await Promise.all(messages.map(msg => this.processMessage(msg)));

        // Reduce results into final output
        return results.reduce<HandleEventOutput>((acc, { consumed, requeue }) => {
            if (consumed) (acc.consumed ??= []).push(consumed);
            if (requeue) (acc.requeue ??= []).push(requeue);
            return acc;
        }, {});
    }

    private async processMessage(message: QueueMessage): Promise<HandleMessageOutput> {
        const { source_type, body } = message;

        const userId = 
            source_type === QueueMessageSourceType.AUTH_SERVICE 
                ? body.userId 
                : body.content?.userId;

        const attempt = 
            source_type === QueueMessageSourceType.AUTH_SERVICE 
                ? 1 // first attempt if coming from auth service
                : body.attempt;

        if (!userId) {
            return { consumed: message };
        }

        // Max attempts reached?
        if (attempt >= MAX_ATTEMPT) {
            logAttemptExhausted({ userId }, "DeleteUserHandler");
            return { consumed: message };
        }

        try {
            let nextPageStart: string | undefined;
            let hasUnsuccessful = false;
            do {
                const output = await this.noteRepository.getNoteIds({
                    PK: userId,
                    limit: 100,
                    pageMark: nextPageStart,
                });

                if (output.count > 0) {
                    const { unsuccessful } = await this.noteRepository.deleteNotes({
                        PK: userId,
                        SKs: output.note_ids
                    });
                    hasUnsuccessful = unsuccessful && unsuccessful.length > 0;
                }
            }
            while(nextPageStart);

            if (hasUnsuccessful) {
                return {
                    consumed: message,
                    requeue: createQueueServiceMessage(QueueMessageEventType.DELETE_USER,{ userId }, attempt+1),
                }
            }

        } catch (err) {
            const repoError = err as AppError;
            if (repoError.operational && repoError.retriable) {
                return { 
                    consumed: message,
                    requeue: createQueueServiceMessage(
                        QueueMessageEventType.DELETE_USER,
                        { userId },
                        attempt + 1
                    )
                };
            }
        }

        return { consumed: message };
    }
}
