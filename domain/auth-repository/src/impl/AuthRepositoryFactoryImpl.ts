import { NoteQueueServiceFactory } from "@notes-app/queue-service";
import { NoteObjectServiceFactory } from '@notes-app/storage-service';
import { AuthServiceFactory } from "@notes-app/authentication";
import { AuthRepository } from "../AuthRepository";
import { AuthRepositoryFactory } from "../AuthRepositoryFactory";
import { AuthRepositoryImpl } from "./AuthRepositoryImpl";

export class AuthRepositoryFactoryImpl implements AuthRepositoryFactory {

    constructor(
        private authServiceFactory: AuthServiceFactory,
        private queueServiceFactory: NoteQueueServiceFactory,
        private storageServiceFactory: NoteObjectServiceFactory,
    ) {}

    public createAuthRepository(): AuthRepository {
        return new AuthRepositoryImpl({
            authService: this.authServiceFactory.createAuthService(),
            queryService: this.queueServiceFactory.createNoteQueueService(),
            storageService: this.storageServiceFactory.createNoteObjectService(),
        })
    }
}