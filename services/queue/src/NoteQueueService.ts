import { QueueMessage } from "./model/QueueMessage"

export interface NoteQueueService {

    enqueueMessage(message: QueueMessage): Promise<void>

    peekMultipleMessages(): Promise<QueueMessage[]>

    removeMultipleMessages(messages: QueueMessage[]): Promise<void>
}