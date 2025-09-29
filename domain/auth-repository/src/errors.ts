import { AUTH_SERVICE_ERROR_CODE } from "@notes-app/authentication";
import { APP_ERROR_CODE, AppError, newAppErrorBuilder } from "@notes-app/common";
import { SQS_ERROR_CODES } from "@notes-app/queue-service";
import { S3_ERROR_CODES } from "@notes-app/storage-service";

export function convertAuthRepositoryError(error: any): AppError {
    if (error instanceof AppError) {
        return convertAppError(error);
    }
    return newAppErrorBuilder()
            .setHttpCode(500)
            .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
            .addDetails({
                description: 'internal server error',
                reason: error,
            })
            .build();
}

function convertAppError(error: AppError): AppError {
    const { code, httpCode, operational, retriable, details} = error;
    const builder = newAppErrorBuilder()
                    .setHttpCode(httpCode)
                    .setCode(code)
                    .setOperational(operational)
                    .setRetriable(retriable);
    switch(code) {
        case AUTH_SERVICE_ERROR_CODE.USERNAME_EXISTS: {
            builder
            .setHttpCode(409)
            .addDetails('email in use');
        }
        break
        case AUTH_SERVICE_ERROR_CODE.UNKNOWN:
        case SQS_ERROR_CODES.UNKNOWN_SQS_ERROR:
        case S3_ERROR_CODES.UNKNOWN_S3_ERROR:
        case AUTH_SERVICE_ERROR_CODE.INVALID_PARAMETER: {
            builder
            .setHttpCode(500)
            .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
            .addDetails({
                description: 'internal server error',
                reason: error,
            });
        }
        break;
        default: {
            builder.setDetails(details);
        }
    }
    return builder.build();
}
