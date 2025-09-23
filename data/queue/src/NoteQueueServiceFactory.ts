import { NoteQueueService } from "./NoteQueueService";

export interface NoteQueueServiceFactory {

    createNoteQueueService(): NoteQueueService;
}