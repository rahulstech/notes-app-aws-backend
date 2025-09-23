import { NoteRepository, NoteRepositoryImpl } from "@note-app/note-repository";
import { ENVIRONMENT, LOGGER } from "@notes-app/common";
import { NoteDataServiceFactory } from "@notes-app/database-service";
import { NoteQueueServiceFactory } from "@notes-app/queue-service";
import { NoteObjectServiceFactory } from "@notes-app/storage-service";
import { NoteRepositoryFactory } from "../NoteRepositoryFactory";

const { NODE_ENV } = ENVIRONMENT;

export class NoteRepositoryFactoryImpl implements NoteRepositoryFactory {

  constructor(
    private databaseFactory: NoteDataServiceFactory,
    private storageFactory: NoteObjectServiceFactory,
    private queueFactory: NoteQueueServiceFactory
  ) {}

  public createNoteRepository(): NoteRepository {
    LOGGER.logInfo(`Creating NoteRepository for NODE_ENV=${NODE_ENV}`);

    const queueService = this.queueFactory.createNoteQueueService();
    const storageService = this.storageFactory.createNoteObjectService();
    const databaseService = this.databaseFactory.createNoteDataService();

    return new NoteRepositoryImpl({ databaseService, storageService, queueService });
  }
}
