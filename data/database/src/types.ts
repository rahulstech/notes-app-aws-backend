import { NoteItem } from './model/Note';
import { AppError } from '@notes-app/common'

export interface DynamoDBClientOptions {
  maxMediasPerItem: number
}

export type ShortNoteItem = Omit<InstanceType<typeof NoteItem>, "medias"|"content">

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
}

export interface CreateNoteDataOutput {
  items?: NoteItem[];
  error?: AppError;
}

export interface UpdateNoteDataInput {
  SK: string;
  title?: string;
  content?: string;
  timestamp_modified: number;
  add_medias?: NoteMediaItem[];
  remove_medias?: string[];
}

export interface UpdateNoteDataOutput {
  items?: NoteItem[],
  fail?: UpdateNoteDataInput[],
  error?: AppError
}

export interface UserNotesPrimaryKey {
  PK: string;
  SK: string;
}

export interface NoteMediaOutput {
  PK: string;
  SK: string;
  key: string;
  type?: string;
  size?: number;
  global_id?: string;
}

export interface NoteGlobalIdAndMediaKeysOutput {
  PK: string;
  SK: string;
  global_id: string;
  media_keys: string[];
}
