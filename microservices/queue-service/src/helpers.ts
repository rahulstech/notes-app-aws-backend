import { LOGGER } from "@notes-app/common";
import { QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";

export function logAttemptExhausted(message: any, tag: string) {
    LOGGER.logFatal(
        message,
        {
            tag,
            cause: "AttemptExhausted"    
        }
    )
}

export function createQueueServiceMessage(eventType: QueueMessageEventType, content: any, attempt: number = 1): QueueMessage {
    return {
        source_type: QueueMessageSourceType.QUEUE_SERVICE,
        event_type: eventType,
        body: { 
            content,
            attempt
        }
    }
}