import {
  AddMediasInput,
  AddMediasOutput,
  CreateNotesInput,
  CreateNotesOutput,
  DeleteMediasByKeyInput,
  DeleteMediasByKeyOutput,
  DeleteMediasByPrefixInput,
  DeleteNotesInput,
  DeleteNotesOutput,
  GetMediaUploadUrlInput,
  GetMediaUploadUrlOutput,
  GetNoteIdsInput,
  GetNoteIdsOutput,
  GetNoteInput,
  GetNoteOutput,
  GetNotesInput,
  GetNotesOutput,
  RemoveMediasInput,
  RemoveMediasOutput,
  UpdateMediaStatusInput,
  UpdateMediaStatusOutput,
  UpdateNotesInput,
  UpdateNotesOutput,
} from './types';

export interface NoteRepository {
  /* Note related methods */

  createNotes(inputs: CreateNotesInput): Promise<CreateNotesOutput>;

  getNote(input: GetNoteInput): Promise<GetNoteOutput>;

  getNotes(input: GetNotesInput): Promise<GetNotesOutput>;

  getNoteIds(input: GetNoteIdsInput): Promise<GetNoteIdsOutput>;

  updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput>;

  deleteNotes(input: DeleteNotesInput): Promise<DeleteNotesOutput>;

  /* NoteMedia related methods */

  addMedias(input: AddMediasInput): Promise<AddMediasOutput>;

  getMediaUploadUrl(input: GetMediaUploadUrlInput): Promise<GetMediaUploadUrlOutput>

  updateMediaStatus(input: UpdateMediaStatusInput): Promise<UpdateMediaStatusOutput>

  removeMedias(input: RemoveMediasInput): Promise<RemoveMediasOutput>;

  deleteMediasByKey(input: DeleteMediasByKeyInput): Promise<DeleteMediasByKeyOutput>;

  deleteMediasByPrefixes(input: DeleteMediasByPrefixInput): Promise<DeleteMediasByKeyOutput>;
}
