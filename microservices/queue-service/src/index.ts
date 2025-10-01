import { SQSEvent, SQSRecord } from "aws-lambda";
import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { NoteQueueServiceFactoryImpl, QueueMessage, QueueMessageEventType } from "@notes-app/queue-service";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { EventHandlerRegistry } from "./types";
import { buildEventHandlerRegistry } from "./eventhandler";
import { QueueApp } from "./app";
import { AuthRepositoryFactoryImpl } from "@notes-app/auth-repository";
import { AuthServiceFactoryImpl } from "@notes-app/authentication";

// ----------------------
// Setup (cold start init)
// ----------------------
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
)

const handlers: EventHandlerRegistry = buildEventHandlerRegistry({authRepositoryFactory,noteRepositoryFactory});

const app = new QueueApp({queueFactory, handlers});

// ----------------------
// Lambda Handler
// ----------------------
export const handler = async (event: SQSEvent): Promise<void> => {

  const queueService = queueFactory.createNoteQueueService();

  // Convert SQS records into queueService-style messages
  const messages: QueueMessage[] = event.Records.map((record: SQSRecord) => queueService.parseRawMessage({
    Body: record.body,
    ReceiptHandle: record.receiptHandle,
  }));

  // Let your app handle them
  await app.handleMessages(messages);
};
