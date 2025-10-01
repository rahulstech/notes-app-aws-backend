import { QueueMessageEventType } from "@notes-app/queue-service";
import { EventHandlerRegistry, HandlerRegistryConfig } from "../types";
import { CreateObjectHandler } from "./CreateObjectHandler";
import { DeleteMediasHandler } from "./DeleteMediasHandler";
import { DeleteNotesHandler } from "./DeleteNotesHandler";
import { UnknownEventHandler } from "./UnknownEventHandler";
import { DeleteUserHandler } from "./DeleteUserHandler";
import { DeleteProfilePhotoHandler } from "./DeleteProfilePhotoHandler";

export function buildEventHandlerRegistry(config: HandlerRegistryConfig): EventHandlerRegistry {
    const noteRepository = config.noteRepositoryFactory.createNoteRepository();
    const authRepository = config.authRepositoryFactory.createAuthRepository();
    return {
        [QueueMessageEventType.CREATE_OBJECT]: new CreateObjectHandler(noteRepository, authRepository),
        [QueueMessageEventType.DELETE_MEDIAS]: new DeleteMediasHandler(noteRepository),
        [QueueMessageEventType.DELETE_NOTES]: new DeleteNotesHandler(noteRepository),
        [QueueMessageEventType.DELETE_USER]: new DeleteUserHandler(noteRepository),
        [QueueMessageEventType.DELETE_PROFILE_PHOTO]: new DeleteProfilePhotoHandler(authRepository),
        [QueueMessageEventType.UNKNOWN]: new UnknownEventHandler(),
    };
}

