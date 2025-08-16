import { Router, Request, Response } from "express";
import { MediaUploadUrlInput, MediaUploadUrlOutput, CreateNoteInput, UpdateNoteInput } from '../service'
import { catchError, validate } from "../middleware";
import { CreateNoteRule, NoteIdParameterRule, NoteMediasRule, UpdateNoteRule } from '../validation/NoteRouterValidationRule' 
import { ApiError } from "../error";

const router = Router();

router.post("/", validate(CreateNoteRule), catchError(async (req: Request, res: Response) => {
    const input: CreateNoteInput = { user_id: "GUEST", ...(req.validValue.body) }
    const note = await req.noteDataService.createNote(input);
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
.patch(
    validate(UpdateNoteRule),
    catchError(async (req: Request, res: Response) => {
        const { note_id } = req.validValue.params
        const input: UpdateNoteInput = { ...(req.validValue.body), note_id, user_id: "GUEST" }
        const note = await req.noteDataService.updateNote(input)
        res.json({
            note
        })
}))


router.post("/media_upload_urls",validate(NoteMediasRule), catchError(async (req: Request, res: Response) => {
    const { medias } = req.validValue.body
    const promises: Promise<MediaUploadUrlOutput>[] = medias
                                                    .map((media: MediaUploadUrlInput) => req.noteObjectService.getMediaUploadUrl(media))
    const urls = await Promise.all(promises)
    res.json({
        urls
    })
}))

export default router;