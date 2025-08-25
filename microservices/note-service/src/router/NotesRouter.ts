import { Router, Request, Response } from 'express';
import {
  CreateNotesRule,
  DeleteNotesRule,
  NoteIdParameterRule,
  NoteMediasUploadRule,
  UpdateNotesRule,
} from '../validation/NoteRouterValidationRule';
import { AppError } from '@notes-app/common';
import { catchError } from '../middleware/Error';
import { validateRequest } from '../middleware/Validator';

const router = Router();

router
  .route('/')
  .post(
    validateRequest(CreateNotesRule),
    catchError(async (req: Request, res: Response) => {
      const { notes } = req.validValue.body;
      const output = await req.noteRepository.createNotes({
        user_id: 'GUEST',
        notes,
      });
      res.json(output);
    })
  )
  .get(
    catchError(async (req: Request, res: Response) => {
      const notes = await req.noteRepository.getNotes({ user_id: 'GUEST' });
      res.json(notes);
    })
  )
  .patch(
    validateRequest(UpdateNotesRule),
    catchError(async (req: Request, res: Response) => {
      const { notes } = req.validValue.body;
      const output = await req.noteRepository.updateNotes({
        user_id: 'GUEST',
        notes: notes.map(({note_id,timestamp_modified,title,content,add_medias,remove_medias}) => ({ 
          SK: note_id,timestamp_modified,title,content,add_medias,remove_medias
        })),
      });
      console.log("output: ",output);
      res.json(output)
    })
  )
  .delete(
    validateRequest(DeleteNotesRule),
    catchError(async (req: Request, res: Response) => {
      const { note_ids } = req.validValue.body;
      await req.noteRepository.deleteNotes({
        user_id: 'GUEST',
        note_ids
      });
      res.sendStatus(200);
    })
  );

router
  .route('/:note_id')
  .all(validateRequest(NoteIdParameterRule))
  .get(
    catchError(async (req: Request, res: Response) => {
      const { note_id } = req.validValue.params;
      const output = await req.noteRepository.getNote({
        user_id: 'GUEST',
        note_id,
      });
      if (output.note !== null) {
        res.json(output);
      } else {
        throw new AppError(404);
      }
    })
  );

router.post(
  '/media_upload_urls',
  validateRequest(NoteMediasUploadRule),
  catchError(async (req: Request, res: Response) => {
    const { media_keys } = req.validValue.body
    const output = await req.noteRepository.getMediaUploadUrls({ user_id: "GUEST", media_keys })
    res.json(output)
  })
);

export default router;
