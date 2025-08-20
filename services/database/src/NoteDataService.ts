import type { Note, CreateNoteInput, NoteMediaStatus, UpdateNoteInput } from './model/Note';

export interface NoteDataService { 

    createNote(input: CreateNoteInput): Promise<Note>

    getNotes(user_id: String): Promise<Note[]>

    getNoteById(note_id: string, user_id: string): Promise<Note | null>

    deleteNote(note_id: string, user_id: string): Promise<void>

    updateNote(input: UpdateNoteInput): Promise<Note>

    updateMediaStatus(note_id: string, user_id: string, key_status: Record<string,NoteMediaStatus>): Promise<void>
}

