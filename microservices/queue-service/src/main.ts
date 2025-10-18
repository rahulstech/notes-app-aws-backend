import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { NoteQueueServiceFactoryImpl } from "@notes-app/queue-service";
import { configenv, installUnexpectedErrorHandlers, LOGGER } from "@notes-app/common";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { EventHandlerRegistry } from "./types";
import { buildEventHandlerRegistry } from "./eventhandler";
import { QueueApp } from "./app";
import { AuthRepositoryFactoryImpl } from "@notes-app/auth-repository";
import { AuthServiceFactoryImpl } from "@notes-app/authentication";

installUnexpectedErrorHandlers();

configenv();

const queueFactory = new NoteQueueServiceFactoryImpl();
const storageFactory = new NoteObjectServiceFactoryImpl();
const noteRepositoryFactory = new NoteRepositoryFactoryImpl(
  new NoteDataServiceFactoryImpl(),
  storageFactory,
  queueFactory
);
const authRepositoryFactory = new AuthRepositoryFactoryImpl(
  new AuthServiceFactoryImpl(),
  queueFactory,
  storageFactory
);

const handlers: EventHandlerRegistry = buildEventHandlerRegistry({authRepositoryFactory,noteRepositoryFactory});

const app = new QueueApp({ queueFactory, handlers, });

async function main() {
  const queueService = queueFactory.createNoteQueueService();
  while (true) {
    const messages = await queueService.peekMultipleMessages();
    await app.handleMessages(messages);
  }
}

(async () => {
  LOGGER.logInfo("queue-service started (dev mode)");
  await main();
})();
