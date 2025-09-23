import { ENVIRONMENT } from '@notes-app/common';
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
} = ENVIRONMENT;

export const CreateNotesRule = joi.object().keys({
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
});

export const GetNotesRule = joi.object().keys({
  query: {
    limit: joi.number().integer().min(1),
    pageMark: joi.string(),
  },
});

export const UpdateNotesRule = joi.object().keys({
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
});

export const DeleteNotesRule = joi.object().keys({
  body: joi.object({
    SKs: joi.array().items(joi.string())
      .min(1)
      .max(MAX_BATCH_DELETE_NOTE_COUNT)
      .required(),
  })
  .rename('note_ids','SKs')
});


export const NoteIdParameterRule = joi.object().keys({
  params: joi.object().keys({
      note_id: joi.string().required(),
    })
    .required(),
});

export const AddNoteMediasRule = joi.object().keys({
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
      })
      .rename('note_id','SK')
    )
    .min(1)
    .max(MAX_BATCH_ADD_MEDIAS_COUNT)
    .required()
  })
});

export const GetNoteMediaUploadUrlRule = joi.object().keys({
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
});

export const RemoveNoteMediasRule = joi.object().keys({
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
});

