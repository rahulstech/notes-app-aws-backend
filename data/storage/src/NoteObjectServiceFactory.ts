import { NoteObjectService } from "./NoteObjectService";

export interface NoteObjectServiceFactory {

    createNoteObjectService(): NoteObjectService;
}