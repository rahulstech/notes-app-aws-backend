import { NextFunction, RequestHandler } from 'express';
import { AppError, newAppErrorBuilder, pickOnly, validate, ValidationRule } from '@notes-app/common';
import { BaseRequest } from '../types';

export function validateRequest(rule: ValidationRule, fields: string[] = ['body']): RequestHandler {
  return (req: BaseRequest,_, next: NextFunction) => {
    const input = pickOnly(req, fields);
    const allValidValue = { ...(req.validValue || {}) };
    const allErrors = [];
    fields.forEach(key => {
      if (rule[key]) {
        try {
          const validValue = validate(rule[key], input[key]);
          allValidValue[key] = validValue;
        }
        catch(error) {
          const validationError = error as AppError;
          allErrors.push(...(validationError.details));
        }
      }
    });

    if (allErrors.length > 0) {
      const validationError: AppError = newAppErrorBuilder()
                                          .setHttpCode(400)
                                          .setDetails(allErrors)
                                          .setOperational(true)
                                          .build();
      next(validationError);
    }
    else {
      req.validValue = allValidValue;
      next();
    }
  };
}