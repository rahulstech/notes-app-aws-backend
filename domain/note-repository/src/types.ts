import { NoteItem, NoteMediaItem, NoteMediaStatus, UpdateNoteDataInputItem } from "@notes-app/database-service";
import { ObjectUploadUrlOutput } from "data/storage/src/types";

export interface ErrorItemOutput {
  code: number;
  message: string;
  retriable: boolean;
}

interface ErrorItem {
  error?: ErrorItemOutput;
}

type NoteMediaItemType = Omit<NoteMediaItem,'status'>;

export type NoteItemType = { user_id: string; note_id: string; } 
                  & Omit<NoteItem, 'PK' | 'SK' | 'medias'> 
                  & { medias?: NoteMediaItemType[] };

/* Note related types */

// create note

export type CreateNoteItemInput = Omit<NoteItemType,'user_id'|'note_id' |'short_content'|'medias'> & Partial<Pick<NoteItemType,'short_content'>>;

export type CreateNoteItemOutput = Omit<NoteItemType,'user_id'|'medias'> & ErrorItem;

export interface CreateNotesInput {
  PK: string;
  inputs: CreateNoteItemInput[];
}

export interface CreateNotesOutput {
  notes?: CreateNoteItemOutput[];
}

// read note

export interface GetNoteInput {
  PK: string;
  SK: string;
}

export interface GetNoteOutput {
  note: NoteItemType;
}

export interface GetNotesInput {
  PK: string;
  limit: number;
  pageMark?: string;
}

export interface GetNotesOutput {
  limit: number;
  count: number;
  pageMark?: string;
  notes: Omit<NoteItemType, 'user_id'|'medias'>[];
}

// update note

export type UpdateNoteItemInput = UpdateNoteDataInputItem;

export type UpdateNoteItemOutput = Partial<Omit<NoteItemType, 'user_id'|'medias'>> & ErrorItem;

export interface UpdateNotesInput {
  PK: string;
  inputs: UpdateNoteItemInput[];
}

export interface UpdateNotesOutput {
  outputs?: UpdateNoteItemOutput[];
}

// delete note 

export interface DeleteNotesInput {
  PK: string;
  SKs: string[];
}

export interface DeleteNotesOutput {
  unsuccessful?: string[];
}

/* NoteMedia related types */

// add media

export interface AddMediaItemInput {
  SK: string;
  medias: Required<Pick<NoteMediaItem, 'global_id'|'type'|'size'>>[];
}

export interface AddMediaItemOutput extends ErrorItem {
  note_id: string;
  medias?: Required<Omit<NoteMediaItem,'status'>>
};

export interface AddMediasInput {
  PK: string;
  inputs: AddMediaItemInput[];
}

export interface AddMediasOutput {
  outputs?: AddMediaItemOutput[];
}

// get media

export interface GetMediaUploadUrlItemInput {
  SK: string;
  media_ids: string[];
}

export interface GetMediaUploadUrlItemOutput extends ErrorItem {
  note_id: string;
  urls?: ({ media_id: string } & Partial<ObjectUploadUrlOutput> & ErrorItem)[];
  media_ids?: string[];
}

export interface GetMediaUploadUrlInput extends ErrorItem {
  PK: string;
  inputs: GetMediaUploadUrlItemInput[];
}

export interface GetMediaUploadUrlOutput {
  outputs: GetMediaUploadUrlItemOutput[];
}

// udate media

export interface UpdateMediaStatusItem {
  media_id: string;
  status: NoteMediaStatus;
  extras?: any;
}

export interface UpdateMediaStatusInput {
  PK: string;
  inputs: Record<string, UpdateMediaStatusItem[]>
}

export interface UpdateMediaStatusOutput {
  items?: UpdateMediaStatusItem[];
}

// delete media

export interface RemoveMediaItem extends ErrorItem {
  SK: string;
  media_ids: string[];
}

export interface RemoveMediasInput {
  PK: string;
  inputs: Omit<RemoveMediaItem,'error'>[];
}

export interface RemoveMediasOutput {
  unsuccessful?: RemoveMediaItem[];
}

export interface DeleteMediasByPrefixInput {
  prefixes: string[];
  extras: any;
}

export interface DeleteMediasByPrefixOutput {
  unsuccessful: string[];
  extras: any;
}

export interface DeleteMediasByKeyInput {
  keys: string[];
}

export interface DeleteMediasByKeyOutput {
  unsuccessful?: string[];
}