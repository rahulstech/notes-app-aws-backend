import type { Express } from 'express'
import express from 'express'
import notesRouter from './router/NotesRouter'
import { expressErrorHandler, installNoteDataService, notFoundHandler } from './middleware';
import { installNoteObjectService } from './middleware/Services';

const app: Express = express();

/////////////////////////////////////////////////
///             MiddleWares                 ///
///////////////////////////////////////////////

app.use(express.json());

app.use(installNoteDataService());
app.use(installNoteObjectService())

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