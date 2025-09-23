import { NextFunction, RequestHandler, Response } from 'express';
import { AppError, newAppErrorBuilder, validate, ValidationRule } from '@notes-app/common';
import { NoteApiExpressRequest } from '../types';

export function validateRequest(rule: ValidationRule): RequestHandler {
  return (req: NoteApiExpressRequest, res: Response, next: NextFunction) => {
    try {
        const { params, query, body } = req;
        const input = {
          params: params && { ...params },
          query: query && { ...query },
          body: body && { ...body }
        };
        const validValues = validate(rule, input);
        const oldValidValues = req.validValue || {};
        req.validValue = { ...oldValidValues, ...validValues };
        next();
    }
    catch(err) {
      if (err instanceof AppError) {
        const appError: AppError = newAppErrorBuilder()
                                    .copy(err as AppError)
                                    .setHttpCode(400)
                                    .setCode(400)
                                    .build()
        next(appError);
      }
      else {
        next(err);
      }
    }
  };
}
