import { 
    QueueMessage, 
    QueueMessageEventType, 
    QueueMessageSourceType 
} from "@notes-app/queue-service";
import { EventHandler, HandleEventOutput, HandleMessageOutput, MAX_ATTEMPT } from "../types";
import { NoteRepository } from "@note-app/note-repository";
import { AppError, LOGGER } from "@notes-app/common";
import { createQueueServiceMessage, logAttemptExhausted } from "../helpers";

const LOG_TAG = "DeleteUserHandler";

/**
 * Handler for processing DELETE_USER events.
 * Supports:
 * - Messages originating from NOTE_SERVICE
 * - Messages originating from QUEUE_SERVICE (reattempts)
 */
export class DeleteUserHandler implements EventHandler {
    constructor(private noteRepository: NoteRepository) {}

    /**
     * Entry point for processing a batch of messages.
     * @param messages Array of incoming queue messages
     * @returns HandleEventOutput with consumed and requeued messages
     */
    public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
        LOGGER.logInfo("received DELETE_USER events", { tag: LOG_TAG, count: messages.length });

        // Process all messages concurrently
        const results: HandleMessageOutput[] = await Promise.all(
            messages.map(msg => this.processMessage(msg))
        );

        // Aggregate into a single output
        return results.reduce<HandleEventOutput>((acc, { consumed, requeue }) => {
            if (consumed) (acc.consumed ??= []).push(consumed);
            if (requeue) (acc.requeue ??= []).push(requeue);
            return acc;
        }, {});
    }

    /**
     * Route message to the correct handler based on source_type.
     */
    private async processMessage(message: QueueMessage): Promise<HandleMessageOutput> {
        switch (message.source_type) {
            case QueueMessageSourceType.NOTE_SERVICE:
                return this.processNoteServiceMessage(message);
            case QueueMessageSourceType.QUEUE_SERVICE:
                return this.processQueueServiceMessage(message);
            default:
                LOGGER.logWarn("unknown source", { tag: LOG_TAG, message });
                return { consumed: message };
        }
    }

    /**
     * Process messages directly from NOTE_SERVICE.
     * - Deletes user notes.
     * - If some notes fail, enqueue retry with failed noteIds or userId.
     */
    private async processNoteServiceMessage(message: QueueMessage): Promise<HandleMessageOutput> {
        const { userId } = message.body;
        if (!userId) {
            return { consumed: message };
        }

        const unsuccessful = await this.deleteUserNotes(userId);
        const requeue = this.buildRequeueMessage(unsuccessful, 1);

        return { consumed: message, requeue };
    }

    /**
     * Process retry messages coming from QUEUE_SERVICE.
     * - Retries deletion based on userId or noteIds.
     * - Reschedules until MAX_ATTEMPT is reached.
     */
    private async processQueueServiceMessage(message: QueueMessage): Promise<HandleMessageOutput> {
        const { content, attempt = 1 } = message.body;
        const { userId, noteIds } = content ?? {};

        if (!userId && !noteIds) {
            return { consumed: message };
        }

        let unsuccessful: string[] | string = [];

        if (userId) {
            // Retry full user deletion
            unsuccessful = await this.deleteUserNotes(userId);
        } else {
            // Retry specific note deletion
            try {
                const { unsuccessful: failed } = await this.noteRepository.deleteNotes(noteIds);
                unsuccessful = failed;
            } catch (error) {
                // If retriable error, retry with the same noteIds
                if ((error as AppError).retriable) {
                    unsuccessful = noteIds;
                }
            }
        }

        const requeue = this.buildRequeueMessage(unsuccessful, attempt + 1);

        // Stop retrying if attempts exhausted
        if (requeue && attempt === MAX_ATTEMPT) {
            logAttemptExhausted({ userId, noteIds }, LOG_TAG);
            return { consumed: message };
        }

        return { consumed: message, requeue };
    }

    /**
     * Delete all notes belonging to a user in paginated fashion.
     * - Returns list of unsuccessful noteIds.
     * - If some error occurs, returns userId for retrying entire deletion.
     */
    private async deleteUserNotes(userId: string): Promise<string[] | string> {
        let nextPageStart: string | undefined;
        const allUnsuccessful: string[] = [];

        do {
            try {
                const { count, note_ids, pageMark } = await this.noteRepository.getNoteIds({
                    PK: userId,
                    limit: 100,
                    pageMark: nextPageStart,
                });

                nextPageStart = pageMark;

                if (count > 0) {
                    const { unsuccessful } = await this.noteRepository.deleteNotes({
                        PK: userId,
                        SKs: note_ids,
                    });
                    if (unsuccessful) {
                        allUnsuccessful.push(...unsuccessful);
                    }
                }
            } catch (error) {
                // Some notes may remain undeleted, retry later with userId
                return userId;
            }
        } while (nextPageStart);

        return allUnsuccessful;
    }

    /**
     * Utility: Builds a requeue message based on failed deletions.
     * - If array of noteIds is returned, retry those.
     * - If userId string is returned, retry full user deletion.
     */
    private buildRequeueMessage(
        unsuccessful: string[] | string,
        attempt: number
    ): QueueMessage | undefined {
        if (Array.isArray(unsuccessful) && unsuccessful.length > 0) {
            return createQueueServiceMessage(
                QueueMessageEventType.DELETE_USER,
                { noteIds: unsuccessful },
                attempt
            );
        }
        else {
            return createQueueServiceMessage(
                QueueMessageEventType.DELETE_USER,
                { userId: unsuccessful },
                attempt
            );
        }
    }
}
