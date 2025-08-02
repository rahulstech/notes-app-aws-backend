import joi from 'joi'

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