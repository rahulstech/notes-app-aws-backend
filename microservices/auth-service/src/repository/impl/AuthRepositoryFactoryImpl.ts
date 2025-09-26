import { NoteQueueServiceFactory } from "@notes-app/queue-service";
import { AuthServiceFactory } from "../../service/AuthServiceFactory";
import { AuthRepository } from "../AuthRepository";
import { AuthRepositoryFactory } from "../AuthRepositoryFactory";
import { AuthRepositoryImpl } from "./AuthRepositoryImpl";

export class AuthRepositoryFactoryImpl implements AuthRepositoryFactory {

    constructor(
        private authServiceFactory: AuthServiceFactory,
        private queurServiceFactory: NoteQueueServiceFactory
    ) {}

    public createAuthRepository(): AuthRepository {
        return new AuthRepositoryImpl({
            authService: this.authServiceFactory.createAuthService(),
            queryService: this.queurServiceFactory.createNoteQueueService(),
        })
    }
}