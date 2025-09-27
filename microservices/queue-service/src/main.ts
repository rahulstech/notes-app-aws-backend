import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { NoteQueueServiceFactoryImpl, QueueMessageEventType } from "@notes-app/queue-service";

import { LOGGER } from "@notes-app/common";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { EventHandler } from "./types";
import { buildEventHandlerRegistry } from "./eventhandler";
import { App } from "./app";


const queueFactory = new NoteQueueServiceFactoryImpl();

const repositoryFactory = new NoteRepositoryFactoryImpl(
  new NoteDataServiceFactoryImpl(),
  new NoteObjectServiceFactoryImpl(),
  queueFactory
)

const queueService = queueFactory.createNoteQueueService();

const noteRepository = repositoryFactory.createNoteRepository();

const handlerRegistry: Record<QueueMessageEventType, EventHandler> = buildEventHandlerRegistry(noteRepository);

const app = new App(queueService, handlerRegistry);

async function main() {
  while (true) {
    const messages = await queueService.peekMultipleMessages();
    await app.handleMessages(messages);
  }
}

(async () => {
  LOGGER.logInfo("queue-service started (dev mode)");
  await main();
})();
