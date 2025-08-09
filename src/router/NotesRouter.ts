import { Router, Request, Response, NextFunction } from "express";
import { MediaPutUrlOutput, Note } from '../service'
import { catchError, validate } from "../middleware";
import { CreateNoteRule, MediaMetaRule, NoteIdParameterRule } from '../validation/NoteRouterValidationRule' 
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

router.route('/:note_id')
.all(validate(NoteIdParameterRule))
.get(catchError(async (req: Request, res: Response) => {
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
.delete(catchError(async (req: Request, res: Response) => {
    const { note_id } = req.validValue.params;
    await req.noteDataService.deleteNote(note_id,"GUEST")
    res.sendStatus(200)
}))

router.post('/:note_id/media_urls', validate(NoteIdParameterRule), validate(MediaMetaRule), 
catchError(async (req: Request, res: Response) => {
    const { note_id } = req.validValue.params
    const { media_metas } = req.validValue.body
    const promises: Promise<MediaPutUrlOutput>[] = []
    media_metas.forEach( (meta: any) => {
        const media_key = `medias/${note_id}/${Date.now()}`
        const options = { ...meta, media_key }
        promises.push(req.noteObjectService.getMediaPutUrl(options))
    });

    const outputs: MediaPutUrlOutput[] = await Promise.all(promises)
    res.json({
        urls: outputs
    })
}))

export default router;