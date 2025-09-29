import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { createNoteExpressApp } from "./app";
import { NoteExpressAppConfiguration } from "./types";
import { LOGGER } from "@notes-app/common";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { NoteQueueServiceFactoryImpl } from "@notes-app/queue-service";
import serverless from "serverless-http";
import { UserClaimExtractorProviderImpl } from "./middleware/UserClaimExtractorProvider";

// build the app configuration
const config: NoteExpressAppConfiguration = {
  noteRepositoryFactory: new NoteRepositoryFactoryImpl(
    new NoteDataServiceFactoryImpl(),
    new NoteObjectServiceFactoryImpl(),
    new NoteQueueServiceFactoryImpl()
  ),
  userClaimExtractorProvider: new UserClaimExtractorProviderImpl(),
};

// create express app
const app = createNoteExpressApp(config);

// wrap with serverless-http
export const handler = serverless(app, {});

// log init (cold start)
LOGGER.logInfo("note-service initialized");
