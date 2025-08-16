import joi from 'joi'

const MAX_ALLOWED_MEDIAS_PER_NOTE = process.env.MAX_ALLOWED_MEDIAS_PER_NOTE ? Number(process.env.MAX_ALLOWED_MEDIAS_PER_NOTE) : 0

const MediaSchema = joi.object().keys({
    global_id: joi.string().required(),
    type: joi.string().required(),
    size: joi.number().required() // TODO: set the size constraint
})

export const CreateNoteRule = joi.object().keys({
    body: joi.object().keys({
        global_id: joi.string().required(),
        title: joi.string().required(),
        content: joi.string().required(),
        medias: joi.array()
                .items(MediaSchema)
                .max(MAX_ALLOWED_MEDIAS_PER_NOTE)
    }).required()
})

export const NoteIdParameterRule = joi.object().keys({
    params: joi.object().keys({
        note_id: joi.string().required()
    })
    .required()
})

export const NoteMediasRule = joi.object().keys({
    body: joi.object().keys({

        medias: joi.array().items({
            id: joi.string().required(),
            key: joi.string().required(),
            mime_type: joi.string().required(),
            size: joi.number().required()
        })
        .required()
    })
})

export const UpdateNoteRule = joi.object().keys({
    body: joi.object().keys({
        title: joi.string(),
        content: joi.string(),
        add_medias: joi.array()
                    .items(MediaSchema)
                    .max(MAX_ALLOWED_MEDIAS_PER_NOTE),
        remove_medias: joi.array().items(joi.string())
    }).required()
})