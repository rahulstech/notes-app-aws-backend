import Note from "./model/Note";
import type { CreateNoteInput, UpdateNoteInput, NoteMedia, NoteMediaInput } from "./model/Note";
import type NoteDataService from "./NoteDataService";
import NoteDynamoDbDataService from "./impl/NoteDynamoDbDataService";
import type {DynamoDBClientOptions} from "./impl/NoteDynamoDbDataService";

import type NoteObjectService from "./NoteObjectService";
import type { MediaObject, MediaUploadUrlOutput, MediaUploadUrlInput } from "./NoteObjectService";
import NoteS3ObjectService from "./impl/NoteS3ObjectService";
import type { S3ClientOptions } from "./impl/NoteS3ObjectService";


export { CreateNoteInput, UpdateNoteInput, NoteMediaInput, Note, NoteMedia, NoteDataService, NoteDynamoDbDataService, DynamoDBClientOptions,

        NoteObjectService, MediaObject, MediaUploadUrlInput, MediaUploadUrlOutput,
        NoteS3ObjectService, S3ClientOptions,
}