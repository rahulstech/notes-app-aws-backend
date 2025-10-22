import { catchError, validateRequest } from "@notes-app/express-common";
import { Response, Router } from "express";
import { AddNoteMediasRule, GetNoteMediaUploadUrlRule, RemoveNoteMediasRule } from "./NoteRouterValidationRule";
import { NoteApiExpressRequest } from "../types";

const router = Router();

// for /notes/media i need to use get('') not get('/')
// get('/') will match /notes/medias/
router.route('')
  .post(validateRequest(AddNoteMediasRule), catchError(async (req: NoteApiExpressRequest, res: Response) => {
    const { data } = req.validValue.body;
    const { outputs } = await req.noteRepository.addMedias({
      PK: req.userClaim.userId,
      inputs: data,
    });
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
      res.sendStatus(204);
    }
  }));

router.put('/uploadurl', 
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

export const mediasRouter = router;