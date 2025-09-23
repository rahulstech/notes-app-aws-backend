import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from "./types";

export interface NoteObjectService {

  getObjectUploadUrl(input: ObjectUploadUrlInput): Promise<ObjectUploadUrlOutput>;
  
  deleteMultipleObjects(keys: string[]): Promise<string[]>;

  deleteObjectByPrefix(prefix: string): Promise<void>

  getMediaUrl(key: string): string;
}
