import {
  CreateNoteDataInputItem,
  CreateNoteDataOutputItem,
  DeleteMultipleNotesDataOutput,
  GetNoteIdsOutput,
  GetNotesOutput,
  NoteItem,
  NoteMediaItem,
  UpdateMediaStatusInputItem,
  UpdateNoteDataInputItem,
  UpdateNoteDataOutputItem,
} from './types';

export interface NoteDataService {

  createMultipleNotes(PK: string, inputs: CreateNoteDataInputItem[]): Promise<CreateNoteDataOutputItem[]>;

  getNotes(PK: String, limit: number, pageMark?: string): Promise<GetNotesOutput>;

  getNoteIds(PK: string, limit: number, pageMark?: string): Promise<GetNoteIdsOutput>;

  getNoteById(PK: string, SK: string): Promise<NoteItem>;

  updateSingleNote(PK: string, input: UpdateNoteDataInputItem): Promise<UpdateNoteDataOutputItem>;

  deleteMultipleNotes(PK: string, SKs: string[]): Promise<DeleteMultipleNotesDataOutput>;

  updateMediaStatus(PK: string,SK: string,items: UpdateMediaStatusInputItem[]): Promise<void>;

  addNoteMedias(PK: string, SK: string, medias: NoteMediaItem[]): Promise<NoteMediaItem[]>

  getNoteMedias(PK: string, SK: string): Promise<Record<string,NoteMediaItem>>

  removeNoteMedias(PK: string, SK: string, gids: string[]): Promise<string[]>
}
