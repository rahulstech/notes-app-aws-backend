import Joi = require("joi");
import { validate } from "./validator";

const ENV_RULES = Joi.object({
    // General
    NODE_ENV: Joi.string().valid('dev','prod','test').default('dev'),
    LOG_LEVEL: Joi.string().valid('debug','info','warn','error','fatal').default('info'),
    NOTE_SERVICE_SERVER_PORT: Joi.number().default(3000),
    AUTH_SERVICE_SERVER_PORT: Joi.number().default(4000),

    // AWS
    AWS_ACCESS_KEY_ID: Joi.string().required(),
    AWS_SECRET_ACCESS_KEY: Joi.string().required(),

    // S3
    S3_REGION: Joi.string().required(),
    S3_BUCKET: Joi.string().required(),
    MEDIA_CDN_URL_PREFIX: Joi.string().uri().required(),

    // SQS
    SQS_REGION: Joi.string().required(),
    SQS_URL: Joi.string().uri().required(),

    // DynamoDB
    DYNAMODB_REGION: Joi.string(),
    DYNAMODB_LOCAL_ENDPOINT_URL: Joi.string().uri(),
    DYNAMODB_NOTES_TABLE: Joi.string().required(),

    // Cognito
    COGNITO_REGION: Joi.string().required(),
    COGNITO_CLIENT_ID: Joi.string().required(),
    COGNITO_USER_POOL_ID: Joi.string().required(),

    // Limits
    MAX_BATCH_CREATE_NOTE_COUNT: Joi.number().default(25),
    MAX_BATCH_UPDATE_NOTE_COUNT: Joi.number().default(25),
    MAX_BATCH_DELETE_NOTE_COUNT: Joi.number().required(),
    MAX_ALLOWED_MEDIAS_PER_NOTE: Joi.number().default(5),
    MAX_BATCH_ADD_MEDIAS_COUNT: Joi.number().default(25),
    MAX_BATCH_GET_MEDIA_UPLOAD_URL_COUNT: Joi.number().default(25),
    MAX_BATCH_REMOVE_MEDIAS_COUNT: Joi.number().default(25),
    MAX_ALLOWED_MEDIAS_SIZE_BYTES: Joi.number().default(10485760), // 10mb
});

let _ENVIRONMENT = undefined;

export const ENVIRONMENT = (() => {
    if (!_ENVIRONMENT) {
        const values = validate(ENV_RULES, process.env);
        _ENVIRONMENT = Object.freeze(values);
    }
    return _ENVIRONMENT;
})();
