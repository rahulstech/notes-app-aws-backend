import { configenv, installUnexpectedErrorHandlers, LOGGER } from "@notes-app/common";
import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { createNoteExpressApp } from "../src/app";
import { NoteExpressAppConfiguration } from "../src/types";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { NoteQueueServiceFactoryImpl } from "@notes-app/queue-service";
import { UserClaimExtractorProviderImpl } from "./middleware/UserClaimExtractorProvider";

installUnexpectedErrorHandlers();

const { NOTE_SERVICE_SERVER_PORT } = configenv();

const config: NoteExpressAppConfiguration = {
  noteRepositoryFactory: new NoteRepositoryFactoryImpl(
                          new NoteDataServiceFactoryImpl(),
                          new NoteObjectServiceFactoryImpl(),
                          new NoteQueueServiceFactoryImpl()
                        ),
  userClaimExtractorProvider: new UserClaimExtractorProviderImpl(),
}

const app = createNoteExpressApp(config);

const PORT = NOTE_SERVICE_SERVER_PORT;

app.listen(PORT, () => {
  LOGGER.logInfo(`server running http://localhost:${PORT}`);
});
