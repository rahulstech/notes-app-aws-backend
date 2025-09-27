import { Router, Response, NextFunction } from 'express';
import {
  AddNoteMediasRule,
  CreateNotesRule,
  DeleteNotesRule,
  GetNoteMediaUploadUrlRule,
  GetNotesRule,
  NoteIdParameterRule,
  RemoveNoteMediasRule,
  UpdateNotesRule,
} from './NoteRouterValidationRule';
import { catchError, validateRequest } from '@notes-app/express-common';
import { NoteApiExpressRequest } from '../types';
import { newAppErrorBuilder } from '@notes-app/common';

const router = Router();

router.use((req: NoteApiExpressRequest, res: Response, next: NextFunction) => {
  if (!req.userClaim) {
    const error = newAppErrorBuilder()
                  .setHttpCode(401)
                  .setOperational(true)
                  .build();
    next(error);
  }
  else {
    next();
  }
})

// path: /notes

router
  .route('/')
  .post(
    validateRequest(CreateNotesRule),
    catchError(async (req: NoteApiExpressRequest, res: Response) => {
      const { notes } = req.validValue.body;
      const output = await req.noteRepository.createNotes({
        PK: req.userClaim.userId,
        inputs: notes,
      });
      res.json(output);
    })
  )
  .get(
    validateRequest(GetNotesRule),
    catchError(async (req: NoteApiExpressRequest, res: Response) => {
      const { limit, pageMark } = req.validValue.query;
      const output = await req.noteRepository.getNotes({
         PK: req.userClaim.userId,
         limit,
         pageMark
        });
      res.json(output);
    })
  )
  .patch(
    validateRequest(UpdateNotesRule),
    catchError(async (req: NoteApiExpressRequest, res: Response) => {
      const { notes } = req.validValue.body;
      const { outputs } = await req.noteRepository.updateNotes({
        PK: req.userClaim.userId,
        inputs: notes,
      });
      res.json({
        result: outputs,
      })
    })
  )
  .delete(
    validateRequest(DeleteNotesRule),
    catchError(async (req: NoteApiExpressRequest, res: Response) => {
      const { SKs } = req.validValue.body;
      await req.noteRepository.deleteNotes({
        PK: req.userClaim.userId,
        SKs
      });
      res.sendStatus(200);
    })
  );

// path /notes/medias

const mediasRouter = Router({
  mergeParams: true,
});

// for /notes/media i need to use get('') not get('/')
// get('/') will match /notes/medias/
mediasRouter.route('')
  .post(validateRequest(AddNoteMediasRule), catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { data } = req.validValue.body;
    const { outputs } = await req.noteRepository.addMedias({
      PK: req.userClaim.userId,
      inputs: data,
    })
    res.json({
      result: outputs,
    })
  }))
  .delete(validateRequest(RemoveNoteMediasRule), catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { data } = req.validValue.body;
    const { unsuccessful } = await req.noteRepository.removeMedias({
      PK: req.userClaim.userId,
      inputs: data,
    });
    if (unsuccessful) {
      res.status(207).json({
         unsuccessful,
      });
    }
    else {
      res.sendStatus(200);
    }
  }));

mediasRouter.put('/uploadurl', 
  validateRequest(GetNoteMediaUploadUrlRule), 
  catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { data } = req.validValue.body;
    const { outputs } = await req.noteRepository.getMediaUploadUrl({
      PK: req.userClaim.userId,
      inputs: data,
    });
    res.json({
      result: outputs,
    })
  }));

router.use('/medias', mediasRouter);

// path: /notes/:note_id

router.get('/:note_id',
  validateRequest(NoteIdParameterRule), 
  catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { note_id } = req.validValue.params;
    const output = await req.noteRepository.getNote({
      PK: req.userClaim.userId,
      SK: note_id,
    });
    res.json(output);
}));

export default router;