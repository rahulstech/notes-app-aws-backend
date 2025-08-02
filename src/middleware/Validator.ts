import { NextFunction, Request, RequestHandler, Response } from 'express'
import { Schema, ValidationError } from 'joi'
import joi from 'joi'
import { ApiError } from '../error'

type ValidationRule = Schema | object

function createSchemFromObjectRule(rule: object): Schema {
    return joi.object().keys(rule)
}

declare global {
    namespace Express {
        interface Request {
            validValue: any
        }
    }
}

function convertValidationErrorToApiError(error: ValidationError): ApiError {
    const details = error.details
    const reasonDetails = details.map( entry => {
        const { message, context } = entry
        return { explain: message, context: context?.key }
    })
    return new ApiError(400, { description: "bad request",  details: reasonDetails})
}

export function validate(rule: ValidationRule): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        let schema: Schema = joi.isSchema(rule) ? rule : createSchemFromObjectRule(rule);
        try {
            const value = await schema.validateAsync(req, { abortEarly: false, stripUnknown: true });
            req.validValue = value;
            next();
        }
        catch(error) {
            // next(error)
            if (error instanceof ValidationError) {
                const apiError = convertValidationErrorToApiError(error)
                next(apiError)
            }
            else {
                next(error)
            }
        }
    }
}