import type { Express } from 'express'
import express from 'express'
import { NoteArrayDataService, installNoteDataService } from './data/index'
import notesRouter from './router/NotesRouter'
import { expressErrorHandler, notFoundHandler } from './middleware';

const app: Express = express();

/////////////////////////////////////////////////
///             MiddleWares                 ///
///////////////////////////////////////////////

app.use(express.json());

app.use(installNoteDataService(new NoteArrayDataService()));

/////////////////////////////////////////////////
///                 Routers                  ///
///////////////////////////////////////////////

app.use("/notes", notesRouter);

/////////////////////////////////////////////////
///              Error Handler               ///
///////////////////////////////////////////////

app.use(notFoundHandler)

app.use(expressErrorHandler)


app.listen(3000, () => {
    console.log("server started");
})