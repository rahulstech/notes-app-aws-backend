import {
  AddMediasInput,
  AddMediasOutput,
  CreateNotesInput,
  CreateNotesOutput,
  DeleteNotesInput,
  GetNoteInput,
  GetNoteOutput,
  GetNotesInput,
  GetNotesOutput,
  RemoveMediasInput,
  RemoveMediasOutput,
  UpdateMediaStatusInput,
  UpdateNotesInput,
  UpdateNotesOutput,
} from './types';

export interface NoteRepository {

  createNotes(inputs: CreateNotesInput): Promise<CreateNotesOutput>;

  getNote(input: GetNoteInput): Promise<GetNoteOutput>;

  getNotes(input: GetNotesInput): Promise<GetNotesOutput>;

  updateNotes(input: UpdateNotesInput): Promise<UpdateNotesOutput>;

  addMedias(input: AddMediasInput): Promise<AddMediasOutput>;

  updateMediaStatus(input: UpdateMediaStatusInput): Promise<void>

  removeMedias(input: RemoveMediasInput): Promise<RemoveMediasOutput>;

  deleteNotes(input: DeleteNotesInput): Promise<void>;
}
