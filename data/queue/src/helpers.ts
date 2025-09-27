import { EventLookup, QueueMessageEventType, QueueMessageSourceType, SourceLookup } from "./types";

export function getSourceType(raw?: string): QueueMessageSourceType {
    if (!raw) return QueueMessageSourceType.UNKNOWN;
    return SourceLookup[raw] ?? QueueMessageSourceType.UNKNOWN;
}
  
export function getEventType(raw?: string): QueueMessageEventType {
    if (!raw) return QueueMessageEventType.UNKNOWN;
    return EventLookup[raw] ?? QueueMessageEventType.UNKNOWN;
}