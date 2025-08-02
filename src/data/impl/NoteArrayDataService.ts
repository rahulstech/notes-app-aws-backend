
import type NoteDataService from "../NoteDataService";
import Note from "../model/Note";


export default class NoteArrayDataService implements NoteDataService {

    private notes: Note[] = [];
    private rowId: number = 0;

    constructor() {}

    public async createNote(note: Note): Promise<Note> {
        note.id = `note-${this.rowId}`;
        this.notes.push(note);
        this.rowId++;
        return Promise.resolve(note)
    }

    public async getNotes(): Promise<Note[]> {
        return Promise.resolve(this.notes)
    }

    public async getNoteById(id: string): Promise<Note | null> {
        const note = this.notes.find(note => note.id === id)
        return Promise.resolve( note ?? null);
    }

    public async deleteNote(id: string): Promise<void> {
        const index: number = this.notes.findIndex( note => note.id === id);
        if (index >= 0) {
            this.notes.slice(index, 1)
        }
        return Promise.resolve();
    }
}