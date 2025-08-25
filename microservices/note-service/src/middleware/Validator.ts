import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError, newAppErrorBuilder, validate, ValidationRule } from '@notes-app/common';

declare global {
  namespace Express {
    interface Request {
      validValue: any;
    }
  }
}

export function validateRequest(rule: ValidationRule): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
        const validValues = await validate(rule, req)
        const oldValidValues = req.validValue || {}
        req.validValue = { ...oldValidValues, ...validValues }
        next()
    }
    catch(err) {
        const appError: AppError = newAppErrorBuilder()
                                    .copy(err as AppError)
                                    .setHttpCode(400)
                                    .setCode(400)
                                    .build()
        next(appError)
    }
  };
}
