import { NextFunction, Request, RequestHandler, Response } from "express";
import { NoteDataService, NoteObjectService, NoteS3ObjectService } from "../service";
import NoteDynamoDbDataService from "../service/impl/NoteDynamoDbDataService";

declare global {
    namespace Express {
        interface Request {
            noteDataService: NoteDataService,
            noteObjectService: NoteObjectService
        }
    }
}

export function installNoteDataService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        req.noteDataService = new NoteDynamoDbDataService()
        next()
    }
}

export function installNoteObjectService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const options = {
            region: process.env.S3_REGION || '',
            bucket: process.env.S3_BUCKET || '',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
        }
        req.noteObjectService = new NoteS3ObjectService(options)
        next()
    }
}