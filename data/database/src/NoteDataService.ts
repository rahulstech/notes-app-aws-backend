import type { NoteItem } from './model/Note';
import {
  CreateNoteDataOutput,
  NoteMediaItem,
  NoteMediaStatus,
  ShortNoteItem,
  UpdateNoteDataInput,
  UpdateNoteDataOutput,
} from './types';

export interface NoteDataService {

  createMultipleNotes(PK: string, notes: NoteItem[]): Promise<CreateNoteDataOutput>;

  getNotes(PK: String): Promise<ShortNoteItem[]>;

  getNoteById(PK: string, SK: string): Promise<NoteItem | null>;

  getNoteMediasByKeys(PK: string, SK: string, keys: string[]): Promise<NoteMediaItem[]>

  updateMultipleNotes(PK: string, inputs: UpdateNoteDataInput[]): Promise<UpdateNoteDataOutput>;

  updateMediaStatus(PK: string,SK: string,items: Pick<NoteMediaItem,'global_id'|'key'|'status'>[]): Promise<void>;

  addNoteMedias(PK: string, SK: string, medias: NoteMediaItem[]): Promise<NoteMediaItem[]>

  removeNoteMedias(PK: string, SK: string, keyGids: Pick<NoteMediaItem,'global_id'|'key'>[]): Promise<string[]>

  deleteMultipleNotes(PK: string, SKs: string[]): Promise<string[]>;

  createNoteId(): string;
}
