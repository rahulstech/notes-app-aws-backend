import joi from 'joi'

const MAX_ALLOWED_MEDIA_PER_NOTE = 5

export const CreateNoteRule = joi.object().keys({
    body: joi.object().keys({
        global_id: joi.string().required(),
        title: joi.string().required(),
        content: joi.string().required()
    }).required()
})

export const NoteIdParameterRule = joi.object().keys({
    params: joi.object().keys({
        note_id: joi.string().required()
    })
    .required()
})

export const MediaMetaRule = joi.object().keys({
    body: joi.object().keys({
        media_metas: joi.array().items(
            joi.object().keys({
                media_type: joi.string().required(),
                media_size: joi.number().required()
            })
        )
        .min(1)
        .max(MAX_ALLOWED_MEDIA_PER_NOTE)
        .required()
    })
})