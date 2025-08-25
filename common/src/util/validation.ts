import { Schema, ValidationError } from 'joi';
import Joi = require('joi');
import { AppError, newAppErrorBuilder } from '../error/AppError';

function createSchemFromObjectRule(rule: object): Schema {
  return Joi.object().keys(rule);
}

function convertValidationErrorToAppError(error: any): AppError {
  const builder = newAppErrorBuilder()
  if (error instanceof ValidationError) {
    const details = error.details.map(({ message, context }) => ({ description: message, context: context?.key }));
    builder.setDetails(details).build()
  }
  else if (typeof error === 'string') {
    builder.addDetails({ description: error, context: 'validate' }).build()
  }
  else if (error instanceof Error) {
    builder.addDetails({ description: error.message, context: `validate - ${error.name}` }).build()
  }
  else {
    builder.addDetails({ description: 'unknown', context: 'validate' }).build()
  }
  return builder.build()
}

export type ValidationRule = Schema | object;

export async function validate(rule: ValidationRule, input: any): Promise<any> {
    let schema: Schema = Joi.isSchema(rule)
      ? rule
      : createSchemFromObjectRule(rule);
    try {
      return await schema.validateAsync(input, {
        abortEarly: false,
        stripUnknown: true,
      });
      
    } catch (error: any) {
      throw convertValidationErrorToAppError(error);
    }
}