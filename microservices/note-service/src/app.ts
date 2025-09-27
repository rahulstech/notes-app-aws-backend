import type { Express, NextFunction, Response } from 'express';
import express from 'express';
import notesRouter from './router/NotesRouter';
import { NoteApiExpressRequest, NoteExpressAppConfiguration } from './types';
import helmet from 'helmet';
import cors from 'cors';
import { extractUserClaim } from './middleware/UserClaim';
import { expressErrorHandler, expressNotFoundHandler } from '@notes-app/express-common'

export function createNoteExpressApp(config: NoteExpressAppConfiguration): Express {

    const app: Express = express();

    /////////////////////////////////////////////////
    ///             MiddleWares                 ///
    ///////////////////////////////////////////////

    app.use(helmet());

    app.use(cors());

    app.use(express.json());

    app.use((req: NoteApiExpressRequest,_, next: NextFunction) => {
        req.noteRepository = config.noteRepositoryFactory.createNoteRepository();
        next();
    });

    app.use(extractUserClaim());

    /////////////////////////////////////////////////
    ///                 Routers                  ///
    ///////////////////////////////////////////////

    app.use('/notes', notesRouter);

    /////////////////////////////////////////////////
    ///              Error Handler               ///
    ///////////////////////////////////////////////

    app.use(expressNotFoundHandler());

    app.use(expressErrorHandler());

    return app;
}
