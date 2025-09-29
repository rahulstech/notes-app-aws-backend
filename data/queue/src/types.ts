export enum QueueMessageSourceType {
  S3 = "S3",
  NOTE_SERVICE = "NOTE_SERVICE",
  QUEUE_SERVICE = "QUEUE_SERVICE",
  AUTH_SERVICE = "AUTH_SERVICE",
  UNKNOWN = "UNKNOWN"
};

export const SourceLookup: Record<string, QueueMessageSourceType> = {
  "aws:s3": QueueMessageSourceType.S3,
  "NOTE_SERVICE": QueueMessageSourceType.NOTE_SERVICE,
  "QUEUE_SERVICE": QueueMessageSourceType.QUEUE_SERVICE,
  "AUTH_SERVICE": QueueMessageSourceType.AUTH_SERVICE,
};

export enum QueueMessageEventType {
  CREATE_OBJECT = "CREATE_OBJECT",
  DELETE_MEDIAS = "DELETE_MEDIAS",
  DELETE_NOTES = "DELETE_NOTES",
  DELETE_USER = "DELETE_USER",
  DELETE_PROFILE_PHOTO = "DELETE_PROFILE_PHOTO",
  UNKNOWN = "UNKNOWN"
}

export const EventLookup: Record<string, QueueMessageEventType> = {
  "ObjectCreated:Put": QueueMessageEventType.CREATE_OBJECT,
  "DELETE_MEDIAS": QueueMessageEventType.DELETE_MEDIAS,
  "DELETE_NOTES": QueueMessageEventType.DELETE_NOTES,
  "DELETE_USER": QueueMessageEventType.DELETE_USER,
  "DELETE_PROFILE_PHOTO": QueueMessageEventType.DELETE_PROFILE_PHOTO,
};

export interface QueueMessage {
  source_type: QueueMessageSourceType;
  event_type: QueueMessageEventType;
  body?: any;
  receipt_handle?: string;
}

export interface RawQueueMessage {
  Body?: string;
  ReceiptHandle?: string;
}
