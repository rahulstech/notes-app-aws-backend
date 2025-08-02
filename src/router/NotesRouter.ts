import { Router, Request, Response } from "express";
import { Note } from '../data'

const router = Router();

router.post("/", async (req: Request, res: Response) => {
    const { global_id, title, content } = req.body;
    const data = new Note(global_id,title, content);

    console.log(`create note ${JSON.stringify(req.body)}`);
    const note = await req.noteDataService.createNote(data);
    res.json({
        code: 201,
        message: "successful",
        body: note,
    });
})

router.get("/", async (req: Request, res: Response) => {
    const notes = await req.noteDataService.getNotes();
    res.json({
        code: 200,
        message: "successful",
        body: notes,
    })
})

router.get("/:note_id", async (req: Request, res: Response) => {
    const { note_id } = req.params
    if (!note_id) {
        res.status(400)
        res.json({
            code: 400,
            message: "note_id not provided"
        })
        return
    }
    const note = await req.noteDataService.getNoteById(note_id)
    if (note) {
        res.json({
            code: 200,
            message: "successful",
            body: note
        })
    } 
    else {
        res.status(404)
        res.json({
            code: 404,
            message: "not found"
        })
    }
})

router.delete("/:note_id", async (req: Request, res: Response) => {
    const { note_id } = req.params;
    if (!note_id) {
        res.status(400)
        res.json({
            code: 400,
            message: "no note id"
        })
    }
    else {
        await req.noteDataService.deleteNote(note_id)
        res.json({
            code: 200,
            message: "successsful",
            body: `note with id ${note_id} deleted successfully`
        })
    }
})

export default router;