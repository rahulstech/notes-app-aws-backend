import { AppError } from "@notes-app/common";
import { NoteItem, NoteMediaItem, NoteMediaStatus } from "@notes-app/database-service";
import { ObjectUploadUrlOutput } from "data/storage/src/types";

interface Medias {
  medias?: NoteMediaItem[];
}

type NoteItemType = Omit<InstanceType<typeof NoteItem>, 'PK' | 'SK' | 'medias'> & Medias
                    & { user_id: string; note_id: string; }

export type NoteItemOutput = Omit<NoteItemType, 'user_id'>;

export type CreateNoteItemInput = Omit<NoteItemType,'user_id' | 'note_id' | 'medias'> 

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

export type UpdateNoteItemInput = Partial<Omit<NoteItemType, 'global_id' | 'timestamp_created' | 'medias'>> 
                                  & Required<Pick<NoteItemType, 'note_id' | 'timestamp_modified'>>

export interface UpdateNotesInput {
  user_id: string;
  notes: UpdateNoteItemInput[];
}

export interface UpdateNotesOutput {
  notes?: NoteItemOutput[],
  error?: AppError
}

export interface AddMediaInputItem {
  global_id: string;
  type: string;
  size: number;
  key?: string;
}

export type AddMediaOutputItem = NoteMediaItem & Partial<ObjectUploadUrlOutput>;

export interface AddMediasInput {
  user_id: string;
  note_medias: Record<string,AddMediaInputItem[]>;
}

export interface AddMediasOutput {
  medias?: AddMediaOutputItem[];
  failure?: string[];
  errors?: AppError;
}

export interface UpdateMediaStatusItem {
  note_id: string;
  key: string;
  status: NoteMediaStatus;
}

export interface UpdateMediaStatusInput {
  user_id: string,
  medias: Record<string, Pick<NoteMediaItem,'key'|'status'>[]>
}

export type RemoveMediaItem = Pick<NoteMediaItem,'global_id'|'key'>

export interface RemoveMediasInput {
  user_id: string;
  note_medias: Record<string,RemoveMediaItem[]>;
}

export interface RemoveMediasOutput {
  failure?: Record<string,RemoveMediaItem[]>;
  error?: AppError;
}

export interface DeleteNotesInput {
  user_id: string;
  note_ids: string[];
}