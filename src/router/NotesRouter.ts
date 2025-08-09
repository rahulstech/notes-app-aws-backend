import { Router, Request, Response } from "express";
import { Note } from '../data'
import { catchError, validate } from "../middleware";
import { CreateNoteRule, NoteIdParameterRule } from '../validation/NoteRouterValidationRule' 
import { ApiError } from "../error";

const router = Router();

router.post("/", validate(CreateNoteRule), catchError(async (req: Request, res: Response) => {
    const { global_id, title, content } = req.validValue.body;
    const data = new Note(global_id,title, content);

    console.log(`create note ${JSON.stringify(req.body)}`);
    const note = await req.noteDataService.createNote(data);
    res.json({
        note
    });
}))

router.get("/", catchError(async (req: Request, res: Response) => {
    const notes = await req.noteDataService.getNotes("GUEST");
    res.json({
        notes
    })
}))

router.get("/:note_id", validate(NoteIdParameterRule), catchError(async (req: Request, res: Response) => {
    const { note_id } = req.validValue.params
    const note = await req.noteDataService.getNoteById(note_id,"GUEST")
    if (note) {
        res.json({
            note
        })
    } 
    else {
        throw new ApiError(404)
    }
}))

router.delete("/:note_id", validate(NoteIdParameterRule), catchError(async (req: Request, res: Response) => {
    const { note_id } = req.validValue.params;
    await req.noteDataService.deleteNote(note_id,"GUEST")
    res.sendStatus(200)
}))

export default router;