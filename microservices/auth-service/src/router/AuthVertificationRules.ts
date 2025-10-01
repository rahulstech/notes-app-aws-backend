import Joi from "joi";

export const RegisterRules = {
    body: Joi.object().keys({
        email: Joi.string().email().required(),
        password: Joi.string().min(8).required(),
        fullname: Joi.string().min(3).max(50).required(),
        user_photo: Joi.string().uri().optional(),
    })
    .required(),
}

export const RegisterVerifyRules = {
    body: Joi.object().keys({
        email: Joi.string().required(),
        code: Joi.string().required(),
    })
    .required(),
}

export const RegisterVerifyCodeRules = {
    query: Joi.object().keys({
        email: Joi.string().required(),
    })
    .required(),
}

export const LogInRules = {
    body: Joi.object().keys({
        email: Joi.string().required(),
        password: Joi.string().required(),
    })
    .required(),
}

export const RefreshRules = {
    body: Joi.object().keys({
        refreshToken: Joi.string().required(),
    })
    .required(),
}

export const ForgotPasswordRules = {
    body: Joi.object().keys({
        email: Joi.string().email().required(),
    })
    .required(),
}

export const ForgotPasswordVerifyRules = {
    body: Joi.object().keys({
        code: Joi.string().required(),
        email: Joi.string().email().required(),
        newPassword: Joi.string().required(),
    })
    .required(),
}

export const ChangeEmailRules = {
    body: Joi.object().keys({
        newEmail: Joi.string().email().required(),
    })
    .required(),
}

export const ChangeEmailVerifyRules = {
    body: Joi.object().keys({
        code: Joi.string().required(),
    })
    .required(),
}

export const ResetPasswordRules = {
    body: Joi.object().keys({
        oldPassword: Joi.string().required(),
        newPassword: Joi.string().required(),
    })
    .required(),
}

export const ResetPasswordVerifyRules = {
    body: Joi.object().keys({
        code: Joi.string().required(),
    })
    .required(),
}

export const UpdateUserProfileRules = {
    body: Joi.object().keys({
        fullname: Joi.string(),
    })
    .required(),
}

export const UserPhotUploadUrlRules = {
    body: Joi.object().keys({
        type: Joi.string().required(),
        size: Joi.number().integer().min(1).required(), // TODO: add a max size
    })
    .required(),
}