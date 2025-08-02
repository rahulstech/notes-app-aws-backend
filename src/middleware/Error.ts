import { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError, AppError } from "../error";

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

type Handler = (req: Request, res: Response, next: NextFunction) => void

export function catchError(handler: Handler | AsyncHandler): RequestHandler {
    return (req: Request,res: Response,next: NextFunction) => {
        try {
            const mayBePromise = handler(req,res,next);
            if (mayBePromise && typeof mayBePromise.then === 'function') {
                mayBePromise.catch(next)
            }
        }
        catch(error) {
            next(error)
        }
    }
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
    next(new ApiError(404))
}

function convertToAppError(error: Error): AppError {
    if (error instanceof AppError) {
        return error;
    }
    return new AppError(500, { description: error.message, details: [{ explain: error.name}]}, false)
}

export function expressErrorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
    const appError = convertToAppError(error)
    console.error(JSON.stringify(error, null, 2))
    if (appError instanceof ApiError) {
        res.status(appError.httpCode)
        res.json({
            code: appError.code,
            message: appError.reason?.description,
            details: appError.reason?.details?.map( entry => entry.explain)
        })
    }
    else {
        res.status(500)
        res.json({
            code: appError.code,
            message: appError.reason?.description
        })
    }

    // TODO: check operatiomal flag of AppError and shutdown if required
}