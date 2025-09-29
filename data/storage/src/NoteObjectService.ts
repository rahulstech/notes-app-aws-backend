import { ObjectUploadUrlInput, ObjectUploadUrlOutput } from "./types";

export interface NoteObjectService {

  getObjectUploadUrl(input: ObjectUploadUrlInput): Promise<ObjectUploadUrlOutput>;

  getMediaUrl(key: string): string;

  getObjectKeyFromMediaUrl(url: string): string;

  isKeyExists(key: string): Promise<boolean>;
  
  deleteMultipleObjects(keys: string[]): Promise<string[]>;

  deleteObjectByPrefix(prefix: string): Promise<void>;

}
