import {
  CreateNotesInput,
  CreateNotesOutput,
  DeleteNotesInput,
  GetNoteInput,
  GetNoteOutput,
  GetNotesInput,
  GetNotesOutput,
  NoteMediaUploadUrlsInput,
  NoteMediaUplodUrlsOutput,
  UpdateNotesInput,
  UpdateNotesOutput,
} from './types';

export interface NoteRepository {
  createNotes(inputs: CreateNotesInput): Promise<CreateNotesOutput>;

  getNote(input: GetNoteInput): Promise<GetNoteOutput>;

  getNotes(input: GetNotesInput): Promise<GetNotesOutput>;

  getMediaUploadUrls(input: NoteMediaUploadUrlsInput): Promise<NoteMediaUplodUrlsOutput>

  updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput>;

  deleteNotes(input: DeleteNotesInput): Promise<void>;
}
