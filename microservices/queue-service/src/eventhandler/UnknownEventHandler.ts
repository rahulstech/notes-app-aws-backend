import { QueueMessage } from "@notes-app/queue-service";
import { LOGGER } from "@notes-app/common";
import { EventHandler, HandleEventOutput } from "../types";

export class UnknownEventHandler implements EventHandler {
  async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    LOGGER.logWarn(messages, "UnknownEventHandler: received unrecognized event type");
    // Don’t consume them
    return { requeue: messages };
  }
}
