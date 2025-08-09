import { NextFunction, Request, Response } from "express";
import { NoteDataService } from "../data";
import NoteDynamoDbDataService from "../data/impl/NoteDynamoDbDataService";

declare global {
    namespace Express {
        interface Request {
            noteDataService: NoteDataService
        }
    }
}

export function installNoteDataService() {
    return (req: Request, res: Response, next: NextFunction) => {
        req.noteDataService = new NoteDynamoDbDataService()
        next()
    }
}