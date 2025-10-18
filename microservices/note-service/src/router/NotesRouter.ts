import { Router, Response, NextFunction } from 'express';
import {
  CreateNotesRule,
  DeleteNotesRule,
  GetNotesRule,
  NoteIdParameterRule,
  UpdateNotesRule,
} from './NoteRouterValidationRule';
import { catchError, validateRequest } from '@notes-app/express-common';
import { NoteApiExpressRequest } from '../types';
import { APP_ERROR_CODE, newAppErrorBuilder } from '@notes-app/common';

const router = Router();

router.use((req: NoteApiExpressRequest, res: Response, next: NextFunction) => {
  if (!req.userClaim) {
    const error = newAppErrorBuilder()
                  .setHttpCode(401)
                  .setCode(APP_ERROR_CODE.UNAUTHORIZED)
                  .setRetriable(false)
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
    validateRequest(GetNotesRule,['query']),
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

// path: /notes/:note_id

router.get('/:note_id',
  validateRequest(NoteIdParameterRule,['params']), 
  catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { note_id } = req.validValue.params;
    const output = await req.noteRepository.getNote({
      PK: req.userClaim.userId,
      SK: note_id,
    });
    res.json(output);
}));

export const notesRouter = router;