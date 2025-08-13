import { NextFunction, Request, RequestHandler, Response } from "express";
import { NoteDataService, NoteObjectService, NoteQueueService, NoteS3ObjectService, NoteSQSQueueService, SQSClientOptions } from "../service";
import NoteDynamoDbDataService from "../service/impl/NoteDynamoDbDataService";

declare global {
    namespace Express {
        interface Request {
            noteDataService: NoteDataService,
            noteObjectService: NoteObjectService,
            noteQueueService: NoteQueueService,
        }
    }
}

const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, 
    S3_REGION, S3_BUCKET, MEDIA_CDN_URL_PREFIX,
    SQS_REGION, SQS_URL
} = process.env

export function installNoteDataService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        req.noteDataService = new NoteDynamoDbDataService(req.noteQueueService)
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

export function installNoteQueueService(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const options: SQSClientOptions = {
            region: SQS_REGION || '',
            accessKeyId: AWS_ACCESS_KEY_ID || '',
            secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
            queueUrl: SQS_URL || ''
        }
        req.noteQueueService = new NoteSQSQueueService(options)
        next()
    }
}