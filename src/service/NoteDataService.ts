import type Note from './model/Note'
import type { CreateNoteInput, NoteMedia, UpdateNoteInput } from './model/Note'

export default interface NoteDataService { 

    createNote(input: CreateNoteInput): Promise<Note>

    getNotes(user_id: String): Promise<Note[]>

    getNoteById(note_id: string, user_id: string): Promise<Note | null>

    deleteNote(note_id: string, user_id: string): Promise<void>

    updateNote(input: UpdateNoteInput): Promise<Note>
}

