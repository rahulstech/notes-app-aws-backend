import { NextFunction, RequestHandler } from 'express';
import {
  NoteRepository,
} from '@note-app/note-repository';
import { NoteApiExpressRequest } from '../types';

// the following code globally changes the Express.Request interface
// which may cause conflict or error in some cases, so use custom Request
// extending Express.Request. see NoteApiExpressRequest
//
// declare global {
//   namespace Express {
//     interface Request {
//       noteRepository: NoteRepository;
//     }
//   }
// }

export function installNoteRepository(noteRepository: NoteRepository): RequestHandler {
  return (req: NoteApiExpressRequest,_, next: NextFunction) => {
    req.noteRepository = noteRepository;
    next();
  };
}
