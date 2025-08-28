import joi from 'joi';

const MAX_ALLOWED_MEDIAS_PER_NOTE = process.env.MAX_ALLOWED_MEDIAS_PER_NOTE
  ? Number(process.env.MAX_ALLOWED_MEDIAS_PER_NOTE)
  : 0;
const MAX_ALLOWED_MEDIAS_SIZE_BYTES = process.env.MAX_ALLOWED_MEDIAS_SIZE_BYTES
  ? Number(process.env.MAX_ALLOWED_MEDIAS_SIZE_BYTES)
  : 0;
const MAX_BATCH_CREATE_NOTE_COUNT = process.env.MAX_BATCH_CREATE_NOTE_COUNT
  ? Number(process.env.MAX_BATCH_CREATE_NOTE_COUNT)
  : 0;

export const CreateNotesRule = joi.object().keys({
  body: joi.object().keys({
    notes: joi
      .array().items(
        joi.object().keys({
            global_id: joi.string().required(),
            title: joi.string().required(),
            content: joi.string().required(),
            timestamp_created: joi.number().required(),
            timestamp_modified: joi.number().required(),
          })
      )
      .min(1)
      .max(MAX_BATCH_CREATE_NOTE_COUNT)
      .required(),
  }),
});

export const NoteIdParameterRule = joi.object().keys({
  params: joi.object().keys({
      note_id: joi.string().required(),
    })
    .required(),
});

// export const NoteMediasUploadRule = joi.object().keys({
//   body: joi.object().keys({
//     media_keys: joi.object().pattern(joi.string(),joi.array().items(joi.string()))
//   }),
// });

export const AddNoteMediasRule = joi.object().keys({
  body: joi.object().keys({
    medias: joi.array().items(joi.object().keys({
        note_id: joi.string(),
        global_id: joi.string().required(),
        type: joi.string().required(),
        size: joi.number().min(1).required(),
        key: joi.string()
      })
    )
    .min(1)
    .max(MAX_ALLOWED_MEDIAS_SIZE_BYTES)
    .required()
  })
});

export const RemoveNoteMediasRule = joi.object().keys({
  body: joi.object().keys({
    medias: joi.array().items(joi.object().keys({
        note_id: joi.string().required(),
        global_id: joi.string().required(),
        key: joi.string().required()
      })
    )
    .min(1) // TODO: set batch remove note media count
    .required()
  })
});

export const UpdateNotesRule = joi.object().keys({
  body: {
    notes: joi
      .array()
      .items({
        note_id: joi.string().required(),
        timestamp_modified: joi.number().required(),
        title: joi.string(),
        content: joi.string(),
      })
      .min(1) // TODO: set batch max update note count
      .required(),
  },
});

export const DeleteNotesRule = joi.object().keys({
  body: joi.object().keys({
    note_ids: joi.array().items(joi.string())
      .min(1) // TODO: set batch max delete note cout
      .required(),
  }),
});
