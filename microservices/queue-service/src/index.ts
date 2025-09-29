import { SQSEvent, SQSRecord } from "aws-lambda";
import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { NoteQueueServiceFactoryImpl, QueueMessage, QueueMessageEventType } from "@notes-app/queue-service";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { EventHandler } from "./types";
import { buildEventHandlerRegistry } from "./eventhandler";
import { App } from "./app";

// ----------------------
// Setup (cold start init)
// ----------------------
const queueFactory = new NoteQueueServiceFactoryImpl();
const storageFactory =   new NoteObjectServiceFactoryImpl();
const repositoryFactory = new NoteRepositoryFactoryImpl(
  new NoteDataServiceFactoryImpl(),
  storageFactory,
  queueFactory
);

const queueService = queueFactory.createNoteQueueService();
const storageService = storageFactory.createNoteObjectService();
const noteRepository = repositoryFactory.createNoteRepository();

const handlerRegistry: Record<QueueMessageEventType, EventHandler> = buildEventHandlerRegistry(storageService,noteRepository);

const app = new App(queueService, handlerRegistry);

// ----------------------
// Lambda Handler
// ----------------------
export const handler = async (event: SQSEvent): Promise<void> => {

  // Convert SQS records into queueService-style messages
  const messages: QueueMessage[] = event.Records.map((record: SQSRecord) => queueService.parseRawMessage({
    Body: record.body,
    ReceiptHandle: record.receiptHandle,
  }));

  // Let your app handle them
  await app.handleMessages(messages);
};
