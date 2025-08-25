import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { AppError, createAppErrorItem, newAppErrorBuilder } from '@notes-app/common';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

type Handler = (req: Request, res: Response, next: NextFunction) => void;

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

export function notFoundHandler(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const { method, path } = req
    next(newAppErrorBuilder()
      .setHttpCode(404)
      .addDetails({ context: `${method} ${path}`, description: `can not handle ${method} request for ${path}` })
      .build()
    );
  };
}

export function expressErrorHandler(): ErrorRequestHandler {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {

    console.log(error);
    const appError = convertToAppError(error);
    
    res.status(appError.httpCode);
    res.json({
      code: appError.code,
      details: appError.details?.map((entry) => entry.description),
    });

    // TODO: check operatiomal flag of AppError and shutdown if required
  };
}

function convertToAppError(error: Error): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(500,500,[createAppErrorItem(error)],false)
}
