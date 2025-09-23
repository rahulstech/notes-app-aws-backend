import { AppError, newAppErrorBuilder } from "@notes-app/common";
import { DYNAMODB_ERROR_CODES } from "@notes-app/database-service";
import { ErrorItemOutput } from "./types";

export const NOTE_REPOSITORY_ERROR_CODES = {
  CREATE_NOTES_FAILED: 5001,
  GET_NOTE_FAILED: 5002,
  GET_NOTE_NOTE_FOUND: 5021,
  GET_NOTES_FAILED: 5003,
  GET_MEDIA_KEYS_FAILED: 5004,
  UPDATE_NOTES_FAILED: 5005,
  ADD_MEDIAS_FAILED: 5006,
  UPDATE_MEDIA_STATUS_FAILED: 5007,
  REMOVE_MEDIAS_FAILED: 5008,
  DELETE_MEDIAS_FAILED: 5009,
  DELETE_NOTES_FAILED: 5010,
  GENERATE_MEDIA_UPLOAD_URLS_FAILED: 5011,
  UNKNOWN_REPOSITORY_ERROR: 5099,
};

export type RepositoryOperation =
  | "createNotes"
  | "getNote"
  | "getNotes"
  | "getMediaKeysByPrefix"
  | "updateNotes"
  | "addMedias"
  | "updateMediaStatus"
  | "removeMedias"
  | "deleteMediasByKey"
  | "deleteNotes"
  | "getMediaUploadUrls"
  | "unknown";

  interface OperationErrorMeta {
    code: number;
    message: string;
  }
  
  export const OPERATION_TO_CODE: Record<RepositoryOperation, OperationErrorMeta> = {
    createNotes: {
      code: NOTE_REPOSITORY_ERROR_CODES.CREATE_NOTES_FAILED,
      message: "create notes failed",
    },
    getNote: {
      code: NOTE_REPOSITORY_ERROR_CODES.GET_NOTE_FAILED,
      message: "get note failed",
    },
    getNotes: {
      code: NOTE_REPOSITORY_ERROR_CODES.GET_NOTES_FAILED,
      message: "get notes failed",
    },
    getMediaKeysByPrefix: {
      code: NOTE_REPOSITORY_ERROR_CODES.GET_MEDIA_KEYS_FAILED,
      message: "get media keys failed",
    },
    updateNotes: {
      code: NOTE_REPOSITORY_ERROR_CODES.UPDATE_NOTES_FAILED,
      message: "update notes failed",
    },
    addMedias: {
      code: NOTE_REPOSITORY_ERROR_CODES.ADD_MEDIAS_FAILED,
      message: "add medias failed",
    },
    updateMediaStatus: {
      code: NOTE_REPOSITORY_ERROR_CODES.UPDATE_MEDIA_STATUS_FAILED,
      message: "update media status failed",
    },
    removeMedias: {
      code: NOTE_REPOSITORY_ERROR_CODES.REMOVE_MEDIAS_FAILED,
      message: "remove medias failed",
    },
    deleteMediasByKey: {
      code: NOTE_REPOSITORY_ERROR_CODES.DELETE_MEDIAS_FAILED,
      message: "delete medias failed",
    },
    deleteNotes: {
      code: NOTE_REPOSITORY_ERROR_CODES.DELETE_NOTES_FAILED,
      message: "delete notes failed",
    },
    getMediaUploadUrls: {
      code: NOTE_REPOSITORY_ERROR_CODES.GENERATE_MEDIA_UPLOAD_URLS_FAILED,
      message: "generate media upload urls failed",
    },
    unknown: {
      code: NOTE_REPOSITORY_ERROR_CODES.UNKNOWN_REPOSITORY_ERROR,
      message: "unknown repository error",
    },
  };
  
export function convertNoteRepositoryError(
  operation: RepositoryOperation,
  error: AppError | any,
  httpCode: number = 500
): AppError {

  if (error instanceof AppError) {
    return createFromAppError(error);
  }
  
  const { code, message } = OPERATION_TO_CODE[operation] ?? OPERATION_TO_CODE.unknown;

   return newAppErrorBuilder()
    .setHttpCode(httpCode)
    .setCode(code)
    .addDetails({
      description: message,
      context: operation !== "unknown" ? operation : undefined,
      reason: error,
    })
    .setOperational(false)
    .build();
}

function createFromAppError(error: AppError): AppError {
  const { code: errorCode, retriable, operational } = error;
  const builder = newAppErrorBuilder()
                  .setCode(errorCode)
                  .setOperational(operational)
                  .setRetriable(retriable);
  switch(errorCode) {
    case DYNAMODB_ERROR_CODES.NOTE_NOT_FOUND: {
      builder
      .setHttpCode(404)
      .addDetails('note not found');
    }
    break;
    case DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS: {
      builder
      .setHttpCode(400)
      .addDetails('too many media items');
    }
    break;
    case DYNAMODB_ERROR_CODES.MEDIA_ITEM_NOT_FOUND: {
      builder
      .setHttpCode(404)
      .addDetails('note media(s) not found');
    }
    break;
    default: {
      builder
      .setHttpCode(500)
      .addDetails({
        description: 'internal server error',
        reason: error,
      })
    }
  }
  return builder.build();
}

export function convertToErrorItemOutput(error: AppError): ErrorItemOutput {
  const { code, retriable, details } = createFromAppError(error);
  return {
    code,
    message: details[0].description,
    retriable,
  }
}
