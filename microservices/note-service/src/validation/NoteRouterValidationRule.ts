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

const MediaSchema = joi.object().keys({
  global_id: joi.string().required(),
  type: joi.string().required(),
  size: joi.number().min(1).required(),
});

export const CreateNoteRule = joi.object().keys({
  body: joi
    .object()
    .keys({
      global_id: joi.string().required(),
      title: joi.string().required(),
      content: joi.string().required(),
      medias: joi.array().items(MediaSchema).max(MAX_ALLOWED_MEDIAS_PER_NOTE),
    })
    .required(),
});

export const CreateNotesRule = joi.object().keys({
  body: joi.object().keys({
    notes: joi
      .array()
      .items(
        joi
          .object()
          .keys({
            global_id: joi.string().required(),
            title: joi.string().required(),
            content: joi.string().required(),
            timestamp_created: joi.number().required(),
            timestamp_modified: joi.number().required(),
            add_medias: joi
              .array()
              .items(MediaSchema)
              .max(MAX_ALLOWED_MEDIAS_PER_NOTE),
          })
          .rename('medias', 'add_medias', {
            ignoreUndefined: true,
          })
      )
      .min(1)
      .max(MAX_BATCH_CREATE_NOTE_COUNT)
      .required(),
  }),
});

export const NoteIdParameterRule = joi.object().keys({
  params: joi
    .object()
    .keys({
      note_id: joi.string().required(),
    })
    .required(),
});

export const NoteMediasUploadRule = joi.object().keys({
  body: joi.object().keys({
    media_keys: joi.object().pattern(joi.string(),joi.array().items(joi.string()))
  }),
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
        add_medias: joi
          .array()
          .items(MediaSchema)
          .max(MAX_ALLOWED_MEDIAS_PER_NOTE),
        remove_medias: joi.array().items(joi.string()),
      })
      .min(1)
      .required(),
  },
});

export const DeleteNotesRule = joi.object().keys({
  body: joi.object().keys({
    note_ids: joi
      .array()
      .items(joi.string())
      .min(1) // TODO: set max delete note count
      .required(),
  }),
});
