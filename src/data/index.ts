import NoteArrayDataService from "./impl/NoteArrayDataService";
import Note from "./model/Note";
import type NoteDataService from "./NoteDataService";
import { NextFunction, Request, RequestHandler, Response } from 'express'

export { NoteDataService, NoteArrayDataService, Note }

declare global {
    namespace Express {
        interface Request {
            noteDataService: NoteDataService
        }
    }
}

export function installNoteDataService(service: NoteDataService): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        req.noteDataService = service;
        next();
    }
}
