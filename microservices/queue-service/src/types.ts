import { NoteRepository, NoteRepositoryFactory } from "@note-app/note-repository";
import { AuthRepository, AuthRepositoryFactory } from "@notes-app/auth-repository";
import { NoteQueueServiceFactory, QueueMessage, QueueMessageEventType } from "@notes-app/queue-service";
import { NoteObjectService } from "@notes-app/storage-service";

export const MAX_ATTEMPT = 3;

export interface HandleEventOutput {

    consumed?: QueueMessage[];

    requeue?: QueueMessage[];
}

export interface HandleMessageOutput {

    consumed?: QueueMessage;

    requeue?: QueueMessage;
}

export interface EventHandler {
    handle(messages: QueueMessage[]): Promise<HandleEventOutput>;
}

export type EventHandlerRegistry = Record<QueueMessageEventType,EventHandler>;

export interface HandlerRegistryConfig {
    authRepositoryFactory: AuthRepositoryFactory;
    noteRepositoryFactory: NoteRepositoryFactory;
}

export interface QueueAppConfig {
    queueFactory: NoteQueueServiceFactory;
    handlers: EventHandlerRegistry;
}