import type { Express, NextFunction } from 'express';
import express from 'express';
import { NoteApiExpressRequest, NoteExpressAppConfiguration } from './types';
import helmet from 'helmet';
import { expressErrorHandler, expressNotFoundHandler, extractUserClaim } from '@notes-app/express-common'
import { notesRouter } from './router/NotesRouter';
import { mediasRouter } from './router/MediasRouter';

export function createNoteExpressApp(config: NoteExpressAppConfiguration): Express {

    const noteRepository = config.noteRepositoryFactory.createNoteRepository();
    const userClaimExtractor = config.userClaimExtractorProvider.getUserClaimExtractor();
    const endpointPrefix = config.endpointPrefix ?? "";
    const app: Express = express();

    /////////////////////////////////////////////////
    ///             MiddleWares                 ///
    ///////////////////////////////////////////////

    app.use(helmet());

    // In production CORS will be implemented via API Gateway
    app.use((_,res,next)=>{
        res.setHeader("Access-Control-Allow-Origin","*");
        res.setHeader("Access-Control-Allow-Headers","*");
        res.setHeader("Access-Control-Allow-Methods","*");
        next();
    })

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

    app.use(`${endpointPrefix}/notes`, notesRouter);
    
    app.use(`${endpointPrefix}/medias`, mediasRouter);

    /////////////////////////////////////////////////
    ///              Error Handler               ///
    ///////////////////////////////////////////////

    app.use(expressNotFoundHandler());

    app.use(expressErrorHandler());

    return app;
}
