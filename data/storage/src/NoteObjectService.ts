import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from "./types";

export interface NoteObjectService {
  getObjectUploadUrl(input: ObjectUploadUrlInput): Promise<ObjectUploadUrlOutput>;

  getMediaUrl(key: string): string;

  deleteMultipleObjects(keys: string[]): Promise<void>;

  createMediaObjectKey(user_id: string, note_id: string): string;
}
