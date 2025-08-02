import type { Express } from 'express'
import express from 'express'
import { NoteArrayDataService, installNoteDataService } from './data/index'
import notesRouter from './router/NotesRouter'

const app: Express = express();

/////////////////////////////////////////////////
///             MiddleWares                 ///
///////////////////////////////////////////////

app.use(express.json());

const dataService = new NoteArrayDataService();
app.use(installNoteDataService(dataService));

/////////////////////////////////////////////////
///                 Routers                  ///
///////////////////////////////////////////////

app.use("/notes", notesRouter);


app.listen(3000, () => {
    console.log("server started");
})