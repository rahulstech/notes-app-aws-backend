import { APP_ERROR_CODE, AppError, newAppErrorBuilder, toErrorReason } from "@notes-app/common";

export const S3_ERROR_CODES = {
  NO_SUCH_BUCKET: 2001,
  NO_SUCH_KEY: 2002,
  SLOW_DOWN: 2004,
};

export function convertS3Error(error: any, context?: any): AppError {
  const errorBuilder = newAppErrorBuilder();

  const errorName = error?.name || "UnknownS3Error";
  const errorMessage = error.message || "An unknown S3 error occurred";

  switch (errorName) {
    case "NoSuchBucket":
      return errorBuilder
        .setHttpCode(404)
        .setCode(S3_ERROR_CODES.NO_SUCH_BUCKET)
        .addDetails({
          description: "Requested S3 bucket does not exist.",
          context,
          reason: {errorMessage},
        })
        .setOperational(false) // infrastructure/config issue
        .build();

    case "NoSuchKey":
    case "NotFound":
      return errorBuilder
        .setHttpCode(404)
        .setCode(S3_ERROR_CODES.NO_SUCH_KEY)
        .addDetails({
          description: "Requested S3 object does not exist.",
          context,
        })
        .setOperational(true)
        .build();

    case "AccessDenied":
      return errorBuilder
        .setHttpCode(403)
        .setCode(APP_ERROR_CODE.ACCESS_DENIED)
        .addDetails({
          description: "Access to the requested S3 resource is denied.",
          context,
          reason: {errorMessage},
        })
        .setOperational(false)
        .build();

    case "SlowDown":
      return errorBuilder
        .setHttpCode(429)
        .setCode(APP_ERROR_CODE.TOO_MANY_REQUESTS)
        .addDetails({
          description: "Too many S3 requests, please slow down.",
          context,
        })
        .setOperational(true)
        .setRetriable(true) // retry after backoff
        .build();

    case "InternalError":
      return errorBuilder
        .setHttpCode(500)
        .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
        .addDetails({
          description: "Internal server error in S3.",
          context,
          reason: {errorMessage},
        })
        .setOperational(false)
        .build();

    case "ServiceUnavailable":
      return errorBuilder
        .setHttpCode(503)
        .setCode(APP_ERROR_CODE.SERVICE_UNAVAILABLE)
        .addDetails({
          description: "S3 service is temporarily unavailable.",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .build();

    default:
      return errorBuilder
        .setHttpCode(500)
        .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
        .addDetails({
          description: "An unknown S3 error occurred.",
          context,
          reason: toErrorReason(error),
        })
        .setOperational(false)
        .build();
  }
}
