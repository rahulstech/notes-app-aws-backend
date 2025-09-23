import { QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";
import { EventHandler, HandleEventOutput, MAX_ATTEMPT } from "../types";
import { NoteRepository } from "@note-app/note-repository";
import { AppError, LOGGER } from "@notes-app/common";

export class DeleteNotesHandler implements EventHandler {

    constructor(
        private noteRepository: NoteRepository
    ) {}

    public async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
        const results = (await Promise.all(messages.map(async (message) => {
                const { prefixes, attempt } = message.body;
                if (message.source_type === QueueMessageSourceType.QUEUE_SERVICE && attempt === MAX_ATTEMPT) {
                    return { consumed: message };
                }
                try {
                    const {unsuccessful} = await this.noteRepository.deleteMediasByPrefixes(prefixes);
                    if (unsuccessful?.length) {
                        return {
                            consumed: message,
                        }
                    }
                    else {
                        return  {
                            consumed: message,
                            requeue: this.createMessageForUnsuccessfulDelete(unsuccessful,attempt===undefined ? 1 : attempt+1)
                        }
                    }
                }
                catch(error) {
                    LOGGER.logError(error, "DeleteNotesHandler");
                    const repoerror = error as AppError;
                    if (!repoerror.retriable) {
                        return { consumed: message };
                    }
                }
                return {};
            }))
        );

        return results.reduce<HandleEventOutput>((acc,{consumed,requeue})=>{
            if (consumed) {
                (acc.consumed ??= []).push(consumed);
            }
            if (requeue) {
                (acc.requeue ??= []).push(requeue);
            }
            return acc;
        },{});
    }

    private createMessageForUnsuccessfulDelete(prefixes: string[], attempt: number = 1): QueueMessage {
        return {
            source_type: QueueMessageSourceType.QUEUE_SERVICE,
            event_type: QueueMessageEventType.DELETE_NOTES,
            body: { prefixes, attempt }
        }
    }
}