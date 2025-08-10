export enum QueueMessageSourceType {
    S3 = "S3",
    NOTE_SERVICE = "NOTE_SERVICE",
}

export enum QueueMessageEventType {
    CREATE_OBJECT = "CREATE_OBJECT",
    DELETE_NOTE = "DELETE_NOTE",
}

export default interface QueueMessage {
    source_type: QueueMessageSourceType,
    event_type: QueueMessageEventType,
    body: Record<string,any>
    receipt_handle?: string
}