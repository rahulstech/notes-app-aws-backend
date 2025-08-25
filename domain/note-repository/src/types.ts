import { AppError } from "@notes-app/common";
import { NoteItem, NoteMediaItem } from "@notes-app/database-service";
import { ObjectUploadUrlOutput } from "data/storage/src/types";

interface Medias {
  medias?: NoteMediaItem[];
}

interface AddMedias {
  add_medias?: Required<Pick<NoteMediaItem, 'key' | 'type' | 'size' | 'global_id'>>[];
}

interface RemoveMedias {
  remove_medias?: string[];
}

interface PrimaryKeys {
  user_id: string;
  note_id: string;
}

type NoteItemType = Omit<InstanceType<typeof NoteItem>, 'PK' | 'SK' | 'medias'> & PrimaryKeys & Medias;

export type NoteItemOutput = Omit<NoteItemType, 'user_id'>;

export type CreateNoteItemInput = Omit<NoteItemType,'user_id' | 'note_id' | 'medias'> & AddMedias;

export type UpdateNoteItemInput = Partial<Omit<NoteItemType, 'global_id' | 'timestamp_created' | 'medias'>> 
                                  & Required<Pick<NoteItemType, 'note_id' | 'timestamp_modified'>>
                                  & AddMedias & RemoveMedias;

export interface CreateNotesInput {
  user_id: string;
  notes: CreateNoteItemInput[];
}

export interface CreateNotesOutput {
  notes?: NoteItemOutput[];
  error?: AppError;
}

export interface GetNoteInput {
  user_id: string;
  note_id: string;
}

export interface GetNoteOutput {
  note: NoteItemOutput | null;
}

export interface GetNotesInput {
  user_id: string;
}

export interface GetNotesOutput {
  notes?: Omit<NoteItemOutput, 'medias'>[];
  error?: AppError;
}

export interface UpdateNotesInput {
  user_id: string;
  notes: UpdateNoteItemInput[];
}

export interface UpdateNotesOutput {
  notes?: NoteItemOutput[],
  error?: AppError
}

export interface DeleteNotesInput {
  user_id: string;
  note_ids: string[];
}

export interface NoteMediaUploadUrlsInput {
  user_id: string,
  media_keys: Record<string,string[]>
}

export type NoteMediaUploadUrlItem = ObjectUploadUrlOutput & { key: string, SK: string }

export interface NoteMediaUplodUrlsOutput {
  urls?: NoteMediaUploadUrlItem[],
  error?: AppError
}
