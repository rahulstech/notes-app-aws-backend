import type { Express, NextFunction } from 'express';
import express from 'express';
import notesRouter from './router/NotesRouter';
import { NoteApiExpressRequest, NoteExpressAppConfiguration } from './types';
import helmet from 'helmet';
import cors from 'cors';
import { expressErrorHandler, expressNotFoundHandler, extractUserClaim } from '@notes-app/express-common'

export function createNoteExpressApp(config: NoteExpressAppConfiguration): Express {

    const noteRepository = config.noteRepositoryFactory.createNoteRepository();
    const userClaimExtractor = config.userClaimExtractorProvider.getApiGatewayUserClaimExtractor();
    const app: Express = express();

    /////////////////////////////////////////////////
    ///             MiddleWares                 ///
    ///////////////////////////////////////////////

    app.use(helmet());

    app.use(cors());

    app.use(express.json());

    app.use((req: NoteApiExpressRequest,_, next: NextFunction) => {
        req.noteRepository = noteRepository;
        req.userClaimExtractor = userClaimExtractor;
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
