import type Note from './model/Note'

export default interface NoteDataService { 

    createNote(note: Note): Promise<Note>

    getNotes(): Promise<Note[]>

    getNoteById(id: string): Promise<Note | null>

    deleteNote(id: string): Promise<void>
}

