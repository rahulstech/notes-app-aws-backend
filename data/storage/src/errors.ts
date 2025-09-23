import { AppError, newAppErrorBuilder } from "@notes-app/common";

export const S3_ERROR_CODES = {
  UNKNOWN_S3_ERROR: 2000,
  NO_SUCH_BUCKET: 2001,
  NO_SUCH_KEY: 2002,
  ACCESS_DENIED: 2003,
  SLOW_DOWN: 2004,
  INTERNAL_ERROR: 2005,
  SERVICE_UNAVAILABLE: 2006,
};

export function convertS3Error(error: any): AppError {
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
          reason: errorMessage,
        })
        .setOperational(false) // infrastructure/config issue
        .build();

    case "NoSuchKey":
      return errorBuilder
        .setHttpCode(404)
        .setCode(S3_ERROR_CODES.NO_SUCH_KEY)
        .addDetails({
          description: "Requested S3 object does not exist.",
          reason: errorMessage,
        })
        .setOperational(true)
        .build();

    case "AccessDenied":
      return errorBuilder
        .setHttpCode(403)
        .setCode(S3_ERROR_CODES.ACCESS_DENIED)
        .addDetails({
          description: "Access to the requested S3 resource is denied.",
          reason: errorMessage,
        })
        .setOperational(false)
        .build();

    case "SlowDown":
      return errorBuilder
        .setHttpCode(429)
        .setCode(S3_ERROR_CODES.SLOW_DOWN)
        .addDetails({
          description: "Too many S3 requests, please slow down.",
          reason: errorMessage,
        })
        .setOperational(true)
        .setRetriable(true) // retry after backoff
        .build();

    case "InternalError":
      return errorBuilder
        .setHttpCode(500)
        .setCode(S3_ERROR_CODES.INTERNAL_ERROR)
        .addDetails({
          description: "Internal server error in S3.",
          reason: errorMessage,
        })
        .setOperational(false)
        .build();

    case "ServiceUnavailable":
      return errorBuilder
        .setHttpCode(503)
        .setCode(S3_ERROR_CODES.SERVICE_UNAVAILABLE)
        .addDetails({
          description: "S3 service is temporarily unavailable.",
          reason: errorMessage,
        })
        .setOperational(true)
        .build();

    default:
      return errorBuilder
        .setHttpCode(error?.$metadata?.httpStatusCode || 500)
        .setCode(S3_ERROR_CODES.UNKNOWN_S3_ERROR)
        .addDetails({
          description: "An unknown S3 error occurred.",
          context: errorName,
          reason: errorMessage,
        })
        .setOperational(false)
        .build();
  }
}
