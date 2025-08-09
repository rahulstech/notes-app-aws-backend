import type Note from './model/Note'

export default interface NoteDataService { 

    createNote(note: Note): Promise<Note>

    getNotes(user_id: String): Promise<Note[]>

    getNoteById(note_id: string, user_id: string): Promise<Note | null>

    deleteNote( note_id: string, user_id: string): Promise<void>
}

