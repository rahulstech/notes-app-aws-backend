import { IssueTokenInput, IssueTokenOutput, LogInOutput, UpdateUserInput } from "@notes-app/authentication";

interface AccessTokenInput {
    accessToken: string;
}

interface CodeDeliveryEmailOutput {
    codeDeliveryEmail: string;
}

/* create */

export interface RegisterUserInput {
    email: string;
    password: string;
    fullname: string;
}

export interface RegisterUserOutput extends CodeDeliveryEmailOutput {}

export enum VerificationType {
    EMAIL = "EMAIL",
    FORGET_PASSWORD = "FORGET_PASSWORD",
    REGISTRATION = "REGISTRATION"
}

export interface ResendVerificationCodeInput extends Partial<AccessTokenInput> {
    type: VerificationType;
    email?: string;
}

export interface ResendVerificationCodeOutput extends CodeDeliveryEmailOutput {
    type: VerificationType;
}

export interface VerifyCodeInput {
    type: VerificationType;
    code: string;
    email?: string;
    newPassword?: string;
    accessToken?: string;
}

/* get */

export interface UserLogInInput {
    email: string;
    password: string;
};

export type UserLogInOutput = LogInOutput;

export interface GetUserProfileInput extends AccessTokenInput {}

export interface GetUserProfileOutput {
    userId: string;
    email: string;
    fullname: string;
    profile_photo?: string;
}

export interface GetUserPhotoUploadUrlInput {
    userId: string;
    type: string;
    size: number;
}

export interface GetUserPhotoUploadUrlOutput {
    key: string;
    url: string;
    http_method: string;
    expiresIn: number; // url valids for expiresIn seconds
    expires: number; // url invalids at expires timestamp in seconds
}

/* update */

export interface ForgotPasswordInput {
    email: string;
}

export interface ForgotPasswordOutput extends CodeDeliveryEmailOutput {}

export interface ChangePasswordInput extends AccessTokenInput {
    oldPassword: string;
    newPassword: string;
};

export interface ChangePasswordOutput extends CodeDeliveryEmailOutput {};

export interface ChangeEmailInput extends AccessTokenInput {
    newEmail: string;
};

export interface ChangeEmailOutput extends CodeDeliveryEmailOutput {}

export interface UpdateUserProfileInput {
    accessToken: string;
    fullname?: string;
};

export interface UpdateUserProfileOutput {
    fullname?: string;
}

export interface UpdateProfilePhotoInput {
    key: string;
}

export interface UpdateTokenInput {
    refreshToken: string;
    email: string;
}

export type UpdateTokenOutput = IssueTokenOutput;

// delete 

export interface DeleteUserInput extends AccessTokenInput {}

