import { NoteRepository } from "@note-app/note-repository";

export interface NoteRepositoryFactory {

    createNoteRepository(): NoteRepository
}