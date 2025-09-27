import { QueueMessage } from "@notes-app/queue-service";
import { LOGGER } from "@notes-app/common";
import { EventHandler, HandleEventOutput } from "../types";

export class UnknownEventHandler implements EventHandler {
  async handle(messages: QueueMessage[]): Promise<HandleEventOutput> {
    LOGGER.logFatal("UnknownEventHandler: received unrecognized event", { messages });
    // consume them
    return { consumed: messages };
  }
}
