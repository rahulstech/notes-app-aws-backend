import type { Express } from 'express';
import express from 'express';
import notesRouter from './router/NotesRouter';
import { installNoteRepository } from './middleware/Services';
import { expressErrorHandler, notFoundHandler } from './middleware/Error';
import { NoteExpressAppConfiguration } from './types';
import helmet from 'helmet';
import cors from 'cors';
import { extractUserClaim } from './middleware/UserClaim';

export function createNoteExpressApp(config: NoteExpressAppConfiguration): Express {

    const app: Express = express();

    /////////////////////////////////////////////////
    ///             MiddleWares                 ///
    ///////////////////////////////////////////////

    app.use(helmet());

    app.use(cors());

    app.use(express.json());

    app.use(installNoteRepository(config.noteRepositoryFactory.createNoteRepository()));

    app.use(extractUserClaim());

    /////////////////////////////////////////////////
    ///                 Routers                  ///
    ///////////////////////////////////////////////

    app.use('/notes', notesRouter);

    /////////////////////////////////////////////////
    ///              Error Handler               ///
    ///////////////////////////////////////////////

    app.use(notFoundHandler());

    app.use(expressErrorHandler());

    return app;
}
