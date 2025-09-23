import { QueueMessage } from "@notes-app/queue-service";

export const MAX_ATTEMPT = 3;

export interface HandleEventOutput {

    consumed?: QueueMessage[];

    requeue?: QueueMessage[];
}

export interface EventHandler {
    handle(messages: QueueMessage[]): Promise<HandleEventOutput>;
}