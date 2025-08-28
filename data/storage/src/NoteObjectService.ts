import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from "./types";

export interface NoteObjectService {

  getObjectUploadUrl(input: ObjectUploadUrlInput): Promise<ObjectUploadUrlOutput>;

  getKeysByPrefix(prefix: string): Promise<string[]>
  
  deleteMultipleObjects(keys: string[]): Promise<string[]>;

  createMediaObjectKey(...path: string[]): string;

  getMediaUrl(key: string): string;
}
