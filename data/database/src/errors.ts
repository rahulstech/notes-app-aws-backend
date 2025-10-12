import { APP_ERROR_CODE, AppError, newAppErrorBuilder, toErrorReason } from "@notes-app/common";

export const DYNAMODB_ERROR_CODES = {

  // private error: can not share error details via api response
  CONDITIONAL_CHECK_FAILED: 1001,
  RESOURCE_NOT_FOUND: 1002,
  PROVISIONED_THROUGHPUT_EXCEEDED: 1003,
  ITEM_COLLECTION_SIZE_LIMIT: 1004,
  TRANSACTION_CONFLICT: 1005,
  REQUEST_LIMIT_EXCEEDED: 1006,
  VALIDATION_ERROR: 1007,
  RESOURCE_IN_USE: 1008,
  INTERNAL_SERVER_ERROR: 1009,
  CONFIGURATION_ERROR: 1010,

  // public error: can share generic error details via api response
  TOO_MANY_MEDIA_ITEMS: 1012,
};

export function convertDynamoDbError(error: any, context?: any): AppError {
  const errorBuilder = newAppErrorBuilder();

  const errorName = error.name || "UnknownError";
  const errorMessage = error.message;

  switch (errorName) {
    case "ConditionalCheckFailedException":
      return errorBuilder
        .setHttpCode(409) // Conflict
        .setCode(DYNAMODB_ERROR_CODES.CONDITIONAL_CHECK_FAILED)
        .addDetails({
          description: "Conditional check failed due to a conflict",
          context,
          reason: {errorMessage},
        })
        .setOperational(false)
        .build();

    case "ResourceNotFoundException": // table, index etc. not found
      return errorBuilder
        .setHttpCode(404)
        .setCode(APP_ERROR_CODE.NOT_FOUND)
        .addDetails({
          description: "Requested DynamoDB resource not found",
          context,
          reason: {errorMessage},
        })
        .setOperational(false) 
        .build();

    case "ProvisionedThroughputExceededException":
      return errorBuilder
        .setHttpCode(429) // Too Many Requests
        .setCode(DYNAMODB_ERROR_CODES.PROVISIONED_THROUGHPUT_EXCEEDED)
        .addDetails({
          description: "DynamoDB provisioned throughput exceeded",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .setRetriable(true) // retry with backoff
        .build();

    case "ItemCollectionSizeLimitExceededException":
      return errorBuilder
        .setHttpCode(400) // Bad Request
        .setCode(DYNAMODB_ERROR_CODES.ITEM_COLLECTION_SIZE_LIMIT)
        .addDetails({
          description: "Item collection size limit exceeded",
          context,
          reason: {errorMessage},
        })
        .setOperational(false)
        .build();

    case "TransactionConflictException":
      return errorBuilder
        .setHttpCode(409)
        .setCode(DYNAMODB_ERROR_CODES.TRANSACTION_CONFLICT)
        .addDetails({
          description: "Transaction conflict occurred in DynamoDB",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .setRetriable(true)
        .build();

    case "RequestLimitExceeded":
      return errorBuilder
        .setHttpCode(429)
        .setCode(APP_ERROR_CODE.TOO_MANY_REQUESTS)
        .addDetails({
          description: "DynamoDB request limit exceeded",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .setRetriable(true)
        .build();

    case "ValidationException":
      return errorBuilder
        .setHttpCode(400)
        .setCode(DYNAMODB_ERROR_CODES.VALIDATION_ERROR)
        .addDetails({
          description: "Validation error in DynamoDB request",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .build();

    case "ResourceInUseException":
      return errorBuilder
        .setHttpCode(409)
        .setCode(DYNAMODB_ERROR_CODES.RESOURCE_IN_USE)
        .addDetails({
          description: "DynamoDB resource is currently in use",
          context,
          reason: {errorMessage},
        })
        .setOperational(true)
        .setRetriable(true)
        .build();

    case "InternalServerError":
      return errorBuilder
        .setHttpCode(500)
        .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
        .addDetails({
          description: "Internal server error in DynamoDB",
          context,
          reason: {errorMessage},
        })
        .setOperational(false)
        .build();

    default:
      return errorBuilder
        .setHttpCode(500)
        .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
        .addDetails({
          description: "Unknown DynamoDB error occurred",
          context,
          reason: toErrorReason(error),
        })
        .setOperational(false)
        .build();
  }
}

export function createNoteNotFoundError(context?: any): AppError {
  return newAppErrorBuilder()
            .setHttpCode(404)
            .setCode(APP_ERROR_CODE.NOT_FOUND)
            .addDetails({
              description: "note not found",
              context,
            })
            .build()
} 

export function createTooManyMediaItemError(context?: any): AppError {
  return newAppErrorBuilder()
            .setHttpCode(400)
            .setCode(DYNAMODB_ERROR_CODES.TOO_MANY_MEDIA_ITEMS)
            .addDetails({
              description: "total media count exceeds accepted media count",
              context,
            })
            .build()
} 


