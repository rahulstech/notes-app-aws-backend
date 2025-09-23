import { AppError, newAppErrorBuilder } from '@notes-app/common';

export const SQS_ERROR_CODES = {
  UNKNOWN_SQS_ERROR: 3000,
  QUEUE_DOES_NOT_EXIST: 3001,
  OVER_LIMIT: 3002,
  PURGE_IN_PROGRESS: 3003,
  INVALID_RECEIPT_HANDLE: 3004,
  MESSAGE_NOT_INFLIGHT: 3005,
  INVALID_MESSAGE_CONTENTS: 3006,
  INTERNAL_ERROR: 3007,
};

export function convertSQSError(error: any): AppError {

  const errorBuilder = newAppErrorBuilder();
  const errorName = error?.name || 'UnknownSQSError';
  const errorMessage = error.message || "An unknown DynamoDB error occurred";

  switch (errorName) {
    case 'QueueDoesNotExist':
      return errorBuilder
        .setHttpCode(404)
        .setCode(SQS_ERROR_CODES.QUEUE_DOES_NOT_EXIST)
        .addDetails({
          description: 'The requested SQS queue does not exist.',
          reason: errorMessage,
        })
        .setOperational(false) // infra/config issue
        .build();

    case 'OverLimit':
      return errorBuilder
        .setHttpCode(429)
        .setCode(SQS_ERROR_CODES.OVER_LIMIT)
        .addDetails({
          description: 'SQS request rate exceeded the allowed limit.',
          reason: errorMessage,
        })
        .setOperational(true) // retryable
        .build();

    case 'PurgeQueueInProgress':
      return errorBuilder
        .setHttpCode(409)
        .setCode(SQS_ERROR_CODES.PURGE_IN_PROGRESS)
        .addDetails({
          description: 'The queue is being purged. Try again later.',
          reason: errorMessage,
        })
        .setOperational(true) // retry after purge
        .build();

    case 'ReceiptHandleIsInvalid':
      return errorBuilder
        .setHttpCode(400)
        .setCode(SQS_ERROR_CODES.INVALID_RECEIPT_HANDLE)
        .addDetails({
          description: 'The provided receipt handle is invalid or expired.',
          reason: errorMessage,
        })
        .setOperational(true) // client can retry with valid handle
        .build();

    case 'MessageNotInflight':
      return errorBuilder
        .setHttpCode(400)
        .setCode(SQS_ERROR_CODES.MESSAGE_NOT_INFLIGHT)
        .addDetails({
          description: 'The requested SQS message is not in-flight.',
          reason: errorMessage,
        })
        .setOperational(true) // client error, fixable
        .build();

    case 'InvalidMessageContents':
      return errorBuilder
        .setHttpCode(400)
        .setCode(SQS_ERROR_CODES.INVALID_MESSAGE_CONTENTS)
        .addDetails({
          description: 'The SQS message contains invalid characters.',
          reason: errorMessage,
        })
        .setOperational(true) // client error, fixable
        .build();

    case 'InternalError':
      return errorBuilder
        .setHttpCode(500)
        .setCode(SQS_ERROR_CODES.INTERNAL_ERROR)
        .addDetails({
          description: 'Internal server error in SQS.',
          reason: errorMessage,
        })
        .setOperational(false)
        .build();

    default:
      return errorBuilder
        .setHttpCode(error?.$metadata?.httpStatusCode || 500)
        .setCode(SQS_ERROR_CODES.UNKNOWN_SQS_ERROR)
        .addDetails({
          description: 'An unknown SQS error occurred.',
          context: errorName,
          reason: errorMessage,
        })
        .setOperational(false)
        .build();
  }
}
