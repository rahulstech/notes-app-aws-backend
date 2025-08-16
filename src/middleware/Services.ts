import { NextFunction, Request, RequestHandler, Response } from "express";
import { NoteDynamoDbDataService, NoteDataService, NoteObjectService,
     NoteS3ObjectService, DynamoDBClientOptions } from "../service";

declare global {
    namespace Express {
        interface Request {
            noteDataService: NoteDataService,
            noteObjectService: NoteObjectService,
        }
    }
}

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, 
    S3_REGION, S3_BUCKET, MEDIA_CDN_URL_PREFIX,
    SQS_REGION, SQS_URL
} = process.env

export function installNoteDataService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const { noteObjectService: objectService } = req
        const options: DynamoDBClientOptions = {
            objectService
        }
        req.noteDataService = new NoteDynamoDbDataService(options)
        next()
    }
}

export function installNoteObjectService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const options = {
            region: S3_REGION || '',
            bucket: S3_BUCKET || '',
            accessKeyId: AWS_ACCESS_KEY_ID || '',
            secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
            mediaBaseUrl: MEDIA_CDN_URL_PREFIX || ''
        }
        req.noteObjectService = new NoteS3ObjectService(options)
        next()
    }
}