// DeleteProfilePhotoHandler.ts
import { QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";
import { EventHandler, HandleEventOutput, MAX_ATTEMPT } from "../types";
import { NoteObjectService } from "@notes-app/storage-service";
import { createQueueServiceMessage, logAttemptExhausted } from "../helpers";

const LOG_TAG = "DeleteProfilePhotoHandler";

export class DeleteProfilePhotoHandler implements EventHandler {

    constructor(
        private storage: NoteObjectService
    ) {}

    public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
        const reattempts: QueueMessage[] = [];
        const keys: string[] = [];

        for (const message of messages) {
            if (message.source_type === QueueMessageSourceType.AUTH_SERVICE) {
                keys.push(message.body.key);
            } else {
                reattempts.push(message);
            }
        }

        const deleteProfilePhotosOutput = await this.deleteProfilePhotos(keys);
        const reattemptsOutput = await this.handleReattempts(reattempts);

        if (deleteProfilePhotosOutput !== null) {
            (reattemptsOutput.requeue ??= []).push(deleteProfilePhotosOutput);
        }
        return reattemptsOutput;
    }

    private async handleReattempts(messages: QueueMessage[]): Promise<HandleEventOutput> {
        const acc: HandleEventOutput = {};

        // process in batches of 10 with 100ms delay
        const batchSize = 10;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);

            const results = await Promise.all(batch.map(async (message) => {
                const { attempt, content } = message.body;
                if (attempt === MAX_ATTEMPT) {
                    logAttemptExhausted({ keys: content }, LOG_TAG);
                    return null;
                }
                return this.deleteProfilePhotos(content, attempt + 1);
            }));

            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                const msg = batch[j];
                let requeue: QueueMessage | null = null;

                if (result) {
                    // deleteProfilePhotos requested a requeue
                    requeue = result;
                } else {
                    const { content, attempt } = msg.body;
                    if (attempt === MAX_ATTEMPT) {
                        logAttemptExhausted({ keys: content }, LOG_TAG);
                    } else {
                        // retry by creating a new queue message
                        requeue = createQueueServiceMessage(
                            QueueMessageEventType.DELETE_PROFILE_PHOTO,
                            content,
                            attempt + 1
                        );
                    }
                }

                if (requeue) {
                    (acc.requeue ??= []).push(requeue);
                }
            }

            if (i + batchSize < messages.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return acc;
    }

    private async deleteProfilePhotos(keys: string[], attempt: number = 1): Promise<QueueMessage | null> {
        const unsuccessful: string[] = await this.storage.deleteMultipleObjects(keys);
        if (unsuccessful && unsuccessful.length > 0) {
            if (attempt === MAX_ATTEMPT) {
                logAttemptExhausted({ keys }, LOG_TAG);
                return null;
            }
            return createQueueServiceMessage(
                QueueMessageEventType.DELETE_PROFILE_PHOTO,
                keys,
                attempt
            );
        }
        return null;
    }
}
