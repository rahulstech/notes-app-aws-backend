import { AppError } from '@notes-app/common'

export enum NoteMediaStatus {
  AVAILABLE = 'AVAILABLE',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
}

export interface NoteMediaItem {
  url: string;
  key: string;
  type: string;
  size: number;
  status: NoteMediaStatus;
  global_id: string;
  media_id: string;
}

export interface NoteItem {
  PK: string;
  SK: string;
  global_id: string;
  title: string;
  content: string;
  short_content: string;
  medias?: Record<string, NoteMediaItem>
  timestamp_created: number;
  timestamp_modified: number;
}

export type ShortNoteItem = Omit<NoteItem, "content">;

export type CreateNoteDataInputItem = Pick<NoteItem,'global_id'|'title'|'content'|'short_content'|'timestamp_created'|'timestamp_modified'>;

export type CreateNoteDataOutputItem = Pick<NoteItem,'global_id'|'title'|'short_content'|'content'|'timestamp_created'|'timestamp_modified'> & { error?: AppError };

export interface CreateNoteDataInput {
  PK: string;
  inputs: CreateNoteDataInputItem[]
}

export interface GetNotesOutput {
  notes: ShortNoteItem[];
  limit: number;
  pageMark?: string;
}

export interface GetNoteIdsOutput {
  SKs: string[];
  limit: number;
  pageMark?: string;
}

export interface UpdateNoteDataInputItem {
  SK: string;
  timestamp_modified: number;
  title?: string;
  content?: string;
  short_content?: string;
}

export type UpdateNoteDataOutputItem = Required<Pick<NoteItem,'SK'>> & Partial<Pick<NoteItem,'title'|'content'|'short_content'|'timestamp_modified'>>;

export interface NoteMediaOutput {
  PK: string;
  SK: string;
  key: string;
  type?: string;
  size?: number;
  global_id?: string;
}

export interface UpdateMediaStatusInputItem {
  media_id: string;
  status: NoteMediaStatus;
}

export type RemoveNoteMediaItem = Pick<NoteMediaItem, 'global_id'|'key'>;

export interface DeleteMultipleNotesDataOutput {
  unsuccessful?: string[];
}
