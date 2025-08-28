export enum QueueMessageSourceType {
  S3 = "S3",
  NOTE_SERVICE = "NOTE_SERVICE",
  QUEUE_SERVICE = "QUEUE_SERVICE",
  UNKNOWN = "UNKNOWN"
}

export enum QueueMessageEventType {
  CREATE_OBJECT = "CREATE_OBJECT",
  DELETE_MEDIAS = "DELETE_MEDIAS",
  DELETE_NOTES = "DELETE_NOTES",
  UNKNOWN = "UNKNOWN"
}

export interface QueueMessage {
  source_type: QueueMessageSourceType;
  event_type: QueueMessageEventType;
  body?: any;
  receipt_handle?: string;
}
