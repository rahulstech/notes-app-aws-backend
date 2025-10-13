import { configenv } from '@notes-app/common';
import joi from 'joi';

const {
  MAX_BATCH_CREATE_NOTE_COUNT,
  MAX_BATCH_UPDATE_NOTE_COUNT,
  MAX_BATCH_DELETE_NOTE_COUNT,
  MAX_BATCH_ADD_MEDIAS_COUNT,
  MAX_BATCH_GET_MEDIA_UPLOAD_URL_COUNT,
  MAX_BATCH_REMOVE_MEDIAS_COUNT,
  MAX_ALLOWED_MEDIAS_PER_NOTE,
  MAX_ALLOWED_MEDIAS_SIZE_BYTES
} = configenv();

export const CreateNotesRule = {
  body: joi.object().keys({
    notes: joi
      .array().items(
        joi.object().keys({
            global_id: joi.string().required(),
            title: joi.string().required(),
            content: joi.string().required(),
            short_content: joi.string(),
            timestamp_created: joi.number().required(),
            timestamp_modified: joi.number().required(),
          })
      )
      .min(1)
      .max(MAX_BATCH_CREATE_NOTE_COUNT)
      .required(),
  }),
};

export const GetNotesRule = {
  query: {
    limit: joi.number().integer().min(1),
    pageMark: joi.string().optional(),
  },
};

export const UpdateNotesRule = {
  body: {
    notes: joi
      .array()
      .items(joi.object({
          SK: joi.string().required(),
          timestamp_modified: joi.number().required(),
          title: joi.string(),
          content: joi.string(),
        })
        .rename('note_id','SK')
      )
      .min(1)
      .max(MAX_BATCH_UPDATE_NOTE_COUNT)
      .required(),
  },
};

export const DeleteNotesRule = {
  body: joi.object({
    SKs: joi.array().items(joi.string())
      .min(1)
      .max(MAX_BATCH_DELETE_NOTE_COUNT)
      .required(),
  })
  .rename('note_ids','SKs')
};


export const NoteIdParameterRule = {
  params: joi.object().keys({
      note_id: joi.string().required(),
    })
    .required(),
};

export const AddNoteMediasRule = {
  body: joi.object().keys({
    data: joi.array().items(joi.object({
        SK: joi.string(),
        medias: joi.array().items(joi.object({
            global_id: joi.string().required(),
            type: joi.string().required(),
            size: joi.number().min(1).max(MAX_ALLOWED_MEDIAS_SIZE_BYTES).required()
          })
        )
        .min(1)
        .max(MAX_ALLOWED_MEDIAS_PER_NOTE)
        .required()
      })
      .rename('note_id','SK')
    )
    .min(1)
    .max(MAX_BATCH_ADD_MEDIAS_COUNT)
    .required()
  })
};

export const GetNoteMediaUploadUrlRule = {
  body: joi.object().keys({
    data: joi.array().items(joi.object({
        SK: joi.string(),
        media_ids: joi.array().items(joi.string())
        .min(1)
        .max(MAX_ALLOWED_MEDIAS_PER_NOTE)
      })
      .rename('note_id','SK')
    )
    .min(1)
    .max(MAX_BATCH_GET_MEDIA_UPLOAD_URL_COUNT)
    .required()
  })
};

export const RemoveNoteMediasRule = {
  body: joi.object().keys({
    data: joi.array().items(joi.object({
        SK: joi.string().required(),
        media_ids: joi.array().items(joi.string())
        .min(1)
        .max(MAX_ALLOWED_MEDIAS_PER_NOTE)
      })
      .rename('note_id','SK')
    )
    .min(1) 
    .max(MAX_BATCH_REMOVE_MEDIAS_COUNT)
    .required()
  })
};

