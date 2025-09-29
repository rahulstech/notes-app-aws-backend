import { APP_ERROR_CODE, AppError, newAppErrorBuilder } from "@notes-app/common";
import { DYNAMODB_ERROR_CODES } from "@notes-app/database-service";
import { ErrorItemOutput } from "./types";

export const NOTE_REPOSITORY_ERROR_CODES = {
  CREATE_NOTES_FAILED: 5001,
};
  
export function convertNoteRepositoryError(error: any,httpCode: number = 500): AppError {
  if (error instanceof AppError) {
    return createFromAppError(error);
  }
  return newAppErrorBuilder()
    .setHttpCode(httpCode)
    .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
    .addDetails({
      description: "internal server error",
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
