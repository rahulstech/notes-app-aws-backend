import { QueueMessage } from "@notes-app/queue-service";

export interface HandleEventOutput {

    consumed?: QueueMessage[];

    requeue?: QueueMessage[];
}