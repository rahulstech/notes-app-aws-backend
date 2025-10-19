import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { APP_ERROR_CODE, AppError, LOGGER, newAppErrorBuilder } from '@notes-app/common';

type AsyncHandler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void>;

type Handler = (req: Request, res: Response, next?: NextFunction) => void;

export function catchError(handler: Handler | AsyncHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const mayBePromise = handler(req, res, next);
      if (mayBePromise && typeof mayBePromise.then === 'function') {
        mayBePromise.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

interface ErrorResponse {
  code: number;
  details?: string | string[];
  retriable?: boolean;
}

export function expressNotFoundHandler(): RequestHandler {
  return (req: Request, res: Response) => {
    const { path, method } = req;
    res.status(404).send({ 
      code: APP_ERROR_CODE.NOT_FOUND,
      details: `${method.toUpperCase()} ${path} not found`,
      retriable: false,
     });
  };
}

export function expressNotImplementedHandler(): RequestHandler {
  return (req: Request, res: Response) => {
    const { method, path } = req;
    res.status(501).send({ 
      code: APP_ERROR_CODE.NOT_IMPLEMENTED,
      details: `not implemented - ${method.toUpperCase()} ${path}`,
      retriable: false,
     });
  };
}

export function expressErrorHandler(): ErrorRequestHandler {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {

    const appError = convertToAppError(error);

    LOGGER.logFatal("api error", appError);

    const errorResponse: ErrorResponse = {
      code: appError.code,
      retriable: appError.retriable,
    };
    if (appError.details && appError.details.length > 0) {
      errorResponse.details = appError.details.map((entry) => entry.description);
    }
    res.status(appError.httpCode).json(errorResponse);

    // exit if operational=false
    if (!appError.operational) {
      setTimeout(()=>process.exit(1),2000);
    }
  };
}

function convertToAppError(error: Error): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return newAppErrorBuilder()
        .setHttpCode(500)
        .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
        .addDetails({
          description: "internal server error",
          reason: error,
        })
        .setOperational(false)
        .build()
}
