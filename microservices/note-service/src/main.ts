import { NoteRepositoryFactoryImpl } from "@note-app/note-repository";
import { createNoteExpressApp } from "./app";
import { NoteExpressAppConfiguration } from "./types";
import { ENVIRONMENT, LOGGER } from "@notes-app/common";
import { NoteDataServiceFactoryImpl } from "@notes-app/database-service";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { NoteQueueServiceFactoryImpl } from "@notes-app/queue-service";

const { NOTE_SERVICE_SERVER_PORT } = ENVIRONMENT;

const config: NoteExpressAppConfiguration = {
  noteRepositoryFactory: new NoteRepositoryFactoryImpl(
                          new NoteDataServiceFactoryImpl(),
                          new NoteObjectServiceFactoryImpl(),
                          new NoteQueueServiceFactoryImpl()
                        ),
}

const app = createNoteExpressApp(config);

const PORT = NOTE_SERVICE_SERVER_PORT || 3000;

app.listen(PORT, () => {
  LOGGER.logInfo(`server running http://localhost:${PORT}`);
});
