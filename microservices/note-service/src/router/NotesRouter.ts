import { Router, Request, Response } from 'express';
import {
  AddNoteMediasRule,
  CreateNotesRule,
  DeleteNotesRule,
  NoteIdParameterRule,
  RemoveNoteMediasRule,
  UpdateNotesRule,
} from '../validation/NoteRouterValidationRule';
import { AppError } from '@notes-app/common';
import { catchError } from '../middleware/Error';
import { validateRequest } from '../middleware/Validator';
import { AddMediaInputItem, RemoveMediaItem } from '@note-app/note-repository';

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
  .route('/medias')
  .put(validateRequest(AddNoteMediasRule), catchError(async (req: Request, res: Response) => {
    const media_inputs: any[] = req.validValue.body.medias
    const note_medias = media_inputs.reduce<Record<string,AddMediaInputItem[]>>((acc,{note_id,global_id,key,type,size})=> {
      if (!acc[note_id]) {
        acc[note_id] = []
      }
      acc[note_id].push({global_id,type,size,key})
      return acc
    },{})

    const { medias } = await req.noteRepository.addMedias({
      user_id: 'GUEST',
      note_medias
    })

    res.json({
      medias
    })
  }))
  .delete(validateRequest(RemoveNoteMediasRule), catchError(async (req: Request, res: Response) => {
    const medias: any[] = req.validValue.body.medias
    const note_medias = medias.reduce<Record<string,RemoveMediaItem[]>>((acc: any,{note_id,global_id,key}) => {
      if (!acc[note_id]) {
        acc[note_id] = []
      }
      acc[note_id].push({global_id,key})
      return acc
    },{})
    const { failure } = await req.noteRepository.removeMedias({
      user_id: 'GUEST',
      note_medias
    })
    if (failure) {
      res.json({
         failure 
      })
    }
    else {
      res.sendStatus(200)
    }
  }))

const note_id_router = Router({ 
  mergeParams: true, // required, otherwise note_id parameter will not pass to this router 
})

note_id_router.use(validateRequest(NoteIdParameterRule))

// for /notes/:note_id i need to use get('') not get('/')
// get('/') will match /notes/:note_id/
note_id_router.get('',catchError(async (req: Request, res: Response) => {
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
}))

router.use('/:note_id', note_id_router)

export default router;
