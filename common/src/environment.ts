import Joi = require("joi");
import { validate, ValidationRule } from "./validator";
import { APP_ERROR_CODE, AppError, newAppErrorBuilder, toErrorReason } from "./apperror";


const COMMON_RULES = {
    // General
    LOG_LEVEL: Joi.string().valid('debug','info','warn','error','fatal').default('info'),

    // AWS
    AWS_ID: Joi.string().required(),
    AWS_SECRET: Joi.string().required(),

    // S3
    S3_REGION: Joi.string().required(),
    S3_BUCKET: Joi.string().required(),
    MEDIA_CDN_URL_PREFIX: Joi.string().uri().required(),

    // SQS
    SQS_REGION: Joi.string().required(),
    SQS_URL: Joi.string().uri().required(),
    SQS_MESSAGE_VISIBILITY_TIMEOUT_SECONDS: Joi.number().integer().default(30),

    // DynamoDB
    DYNAMODB_NOTES_TABLE: Joi.string().required(),

    // Cognito
    COGNITO_REGION: Joi.string().required(),
    COGNITO_CLIENT_ID: Joi.string().required(),
    COGNITO_CLIENT_SECRET: Joi.string().required(),
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
};

const DEV_ENV_RULES = Joi.object({
    ...COMMON_RULES,

    // General
    NOTE_SERVICE_SERVER_PORT: Joi.number().default(3000),
    AUTH_SERVICE_SERVER_PORT: Joi.number().default(4000),

    // DynamoDB
    DYNAMODB_LOCAL_ENDPOINT_URL: Joi.string().uri(),
});

const PROD_ENV_RULES = Joi.object({
    ...COMMON_RULES,

    // DynamoDB
    DYNAMODB_REGION: Joi.string(),
});

let CACHED_ENV: Record<string,any> | undefined;

export function configenv(): Record<string,any> {
    if (CACHED_ENV) {
        return CACHED_ENV!;
    }
   
    let rules: ValidationRule | undefined;
    switch(process.env.NODE_ENV) {
        case "prod": rules = PROD_ENV_RULES;
        break;
        case "dev": rules = DEV_ENV_RULES;
        break;
        default: rules = undefined;
    }
    if (rules !== undefined) {
        try {
            const values = validate(rules, process.env);
            // in production, modifying process.env is not allowed in some environments (like AWS Lambda)
            // therefore, we cache the validated env variables instead of modifying process.env directly
            // process.env = {
            //     ...process.env,
            //     ...values,
            // };
            CACHED_ENV = {
                ...process.env,
                ...values
            };
        }
        catch(error) {
            let apperror: AppError;
            if (error instanceof AppError) {
                error.operational = false;
                error.code = APP_ERROR_CODE.INTERNAL_SERVER_ERROR;
                error.httpCode = 500;
                apperror = error;
            }
            else {
                apperror = newAppErrorBuilder()
                            .setHttpCode(500)
                            .setCode(APP_ERROR_CODE.INTERNAL_SERVER_ERROR)
                            .setOperational(false)
                            .addDetails({
                                description:"environment variable validation error",
                                reason: toErrorReason(error),
                            })
                            .build();
            }
            throw apperror;
        }
    }
    else {
        CACHED_ENV = process.env as Record<string,any>;
    }
    return CACHED_ENV!;
}


