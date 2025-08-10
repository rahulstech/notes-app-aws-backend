import QueueMessage from "./model/QueueMessage"

export default interface NoteQueueService {

    enqueueMessage(message: QueueMessage): Promise<void>

    peekMultipleMessages(): Promise<QueueMessage[]>

    removeMultipleMessages(messages: QueueMessage[]): Promise<void>
}