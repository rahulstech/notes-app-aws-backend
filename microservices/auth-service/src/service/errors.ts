import { APP_ERROR_CODE, AppError, newAppErrorBuilder } from "@notes-app/common";

export const AUTH_SERVICE_ERROR_CODE = {
    UNKNOWN: 4000,
    NOT_AUTHORIZED: 4001,
    USER_NOT_FOUND: 4002,
    USERNAME_EXISTS: 4003,
    INVALID_PASSWORD: 4004,
    CODE_MISMATCH: 4005,
    EXPIRED_CODE: 4006,
    INVALID_PARAMETER: 4009,

    USER_ALREADY_VERIFIED: 4010,
} as const;

export function convertCognitoError(error: NonNullable<any>): AppError {
    const builder = newAppErrorBuilder();

    const errorType = error.name;

    switch (errorType) {
        case "NotAuthorizedException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.NOT_AUTHORIZED)
                .setHttpCode(401)
                .addDetails({
                    description: "You are not authorized to perform this action.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "UserNotFoundException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.USER_NOT_FOUND)
                .setHttpCode(404)
                .addDetails({
                    description: "The specified user does not exist.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "UsernameExistsException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.USERNAME_EXISTS)
                .setHttpCode(409)
                .addDetails({
                    description: "The username already exists.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "InvalidPasswordException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.INVALID_PASSWORD)
                .setHttpCode(400)
                .addDetails({
                    description: "The provided password is invalid.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "CodeMismatchException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.CODE_MISMATCH)
                .setHttpCode(400)
                .addDetails({
                    description: "The provided code does not match.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "ExpiredCodeException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.EXPIRED_CODE)
                .setHttpCode(400)
                .addDetails({
                    description: "The provided code has expired.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "TooManyRequestsException":
            builder
                .setCode(APP_ERROR_CODE.TOO_MANY_REQUESTS)
                .setHttpCode(429)
                .addDetails({
                    description: "Too many requests have been made. Please try again later.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "LimitExceededException":
            builder
                .setCode(APP_ERROR_CODE.LIMIT_EXCEEDED)
                .setHttpCode(429)
                .addDetails({
                    description: "limit exceeded.",
                    context: errorType,
                    reason: error.message,
                });
            break;

        case "InvalidParameterException":
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.INVALID_PARAMETER)
                .setHttpCode(400)
                .addDetails({
                    description: "One or more parameters are invalid.",
                    context: errorType,
                    reason: error.message,
                });
            break;
        
        case "AliasExistsException": 
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.USERNAME_EXISTS)
                .setHttpCode(400)
                .addDetails({
                    description: "username already exists",
                    context: errorType,
                    reason: error
                })
            break;
        default: {
            builder
                .setCode(AUTH_SERVICE_ERROR_CODE.UNKNOWN)
                .setHttpCode(500)
                .addDetails({
                    description: "An unknown error occurred with Cognito.",
                    context: "Unknown",
                    reason: error,
                });
            break;
        }
    }

    return builder.build();
}
