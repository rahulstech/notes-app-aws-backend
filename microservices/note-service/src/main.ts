import type { Express } from 'express';
import express from 'express';
import notesRouter from './router/NotesRouter';
import { installNoteRepository } from './middleware/Services';
import { expressErrorHandler, notFoundHandler } from './middleware/Error';

const app: Express = express();

/////////////////////////////////////////////////
///             MiddleWares                 ///
///////////////////////////////////////////////

app.use(express.json());

app.use(installNoteRepository());

/////////////////////////////////////////////////
///                 Routers                  ///
///////////////////////////////////////////////

app.use('/notes', notesRouter);

/////////////////////////////////////////////////
///              Error Handler               ///
///////////////////////////////////////////////

app.use(notFoundHandler());

app.use(expressErrorHandler());

app.listen(3000, () => {
  console.log('server started');
});
