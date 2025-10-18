import { APP_ERROR_CODE, AppError, newAppErrorBuilder, toErrorReason } from "@notes-app/common";
import { DYNAMODB_ERROR_CODES } from "@notes-app/database-service";
import { ErrorItemOutput } from "./types";

export const NOTE_REPOSITORY_ERROR_CODES = {
  CREATE_NOTES_FAILED: 5001,
};
  
export function convertNoteRepositoryError(error: any,context?: any, httpCode: number = 500): AppError {
  if (error instanceof AppError) {
    return createFromAppError(error,context);
  }
  return newAppErrorBuilder()
    .setHttpCode(httpCode)
    .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
    .addDetails({
      description: "internal server error",
      context,
      reason: toErrorReason(error),
    })
    .setOperational(false)
    .build();
}

function createFromAppError(error: AppError, context?: any): AppError {
  const { httpCode, code: errorCode, retriable, operational } = error;
  const builder = newAppErrorBuilder()
                  .setHttpCode(httpCode)
                  .setCode(errorCode)
                  .setOperational(operational)
                  .setRetriable(retriable);
  switch(errorCode) {
    case DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS: {
      builder
      .setHttpCode(400)
      .addDetails({
        description: "too many media items",
        context,
      });
    }
    break;
    case APP_ERROR_CODE.NOT_FOUND: {
      builder.addDetails({
        description:"not found",
        context,
        reason: error
      })
    }
    break;
    case APP_ERROR_CODE.INTERNAL_SERVER_ERROR:
    default: {
      builder.addDetails({
        description: "internal server error",
        context,
        reason: error
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
