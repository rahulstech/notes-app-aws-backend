import { AUTH_SERVICE_ERROR_CODE } from "@notes-app/authentication";
import { APP_ERROR_CODE, AppError, newAppErrorBuilder } from "@notes-app/common";

export function convertAuthRepositoryError(error: any, context?: any): AppError {
    if (error instanceof AppError) {
        return convertAppError(error,context);
    }
    return newAppErrorBuilder()
            .setHttpCode(500)
            .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
            .addDetails({
                description: 'internal server error',
                context,
                reason: error,
            })
            .build();
}

function convertAppError(error: AppError,context?: any): AppError {
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
            .addDetails({
                description: "email in use",
                context,
            });
        }
        break
        case AUTH_SERVICE_ERROR_CODE.INVALID_PARAMETER: {
            builder
            .setHttpCode(500)
            .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
            .addDetails({
                description: 'internal server error',
                context,
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
