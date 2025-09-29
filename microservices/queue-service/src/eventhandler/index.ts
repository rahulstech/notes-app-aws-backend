import { QueueMessageEventType } from "@notes-app/queue-service";
import { EventHandler } from "../types";
import { CreateObjectHandler } from "./CreateObjectHandler";
import { DeleteMediasHandler } from "./DeleteMediasHandler";
import { DeleteNotesHandler } from "./DeleteNotesHandler";
import { UnknownEventHandler } from "./UnknownEventHandler";
import { NoteRepository } from "@note-app/note-repository";
import { DeleteUserHandler } from "./DeleteUserHandler";
import { DeleteProfilePhotoHandler } from "./DeleteProfilePhotoHandler";
import { NoteObjectService } from "@notes-app/storage-service";



export function buildEventHandlerRegistry(storage: NoteObjectService, noteRepository: NoteRepository): Record<QueueMessageEventType,EventHandler> {
    return {
        [QueueMessageEventType.CREATE_OBJECT]: new CreateObjectHandler(noteRepository),
        [QueueMessageEventType.DELETE_MEDIAS]: new DeleteMediasHandler(noteRepository),
        [QueueMessageEventType.DELETE_NOTES]: new DeleteNotesHandler(noteRepository),
        [QueueMessageEventType.DELETE_USER]: new DeleteUserHandler(noteRepository),
        [QueueMessageEventType.DELETE_PROFILE_PHOTO]: new DeleteProfilePhotoHandler(storage),
        [QueueMessageEventType.UNKNOWN]: new UnknownEventHandler(),
    };
}

