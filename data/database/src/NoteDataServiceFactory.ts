import { NoteDataService } from "./NoteDataService";

export interface NoteDataServiceFactory {
    
    createNoteDataService(): NoteDataService
}