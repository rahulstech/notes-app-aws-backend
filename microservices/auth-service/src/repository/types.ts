import { IssueTokenOutput, LogInOutput, UpdateUserInput } from "../service/types";

export interface RegisterUserInput {
    email: string;
    password: string;
    fullname: string;
    user_photo?: string;
}

export enum VerificationType {
    EMAIL = "EMAIL",
    RESET_PASSWORD = "RESET_PASSWORD",
    FORGET_PASSWORD = "FORGET_PASSWORD",
    REGISTRATION = "REGISTRATION"
}

export interface ResendVerificationCodeInput {
    type: VerificationType;
    email?: string;
    accessToken?: string;
}

export interface VerifyCodeInput {
    type: VerificationType;
    code: string;
    email?: string;
    newPassword?: string;
    accessToken?: string;
}

export interface GetUserInfoInput {
    accessToken?: string;
}

export interface UserLogInInput {
    email: string;
    password: string;
};

export type UserLogInOutput = LogInOutput;

export enum ChangePasswordType {
    FORGET_PASSWORD = "FORGET_PASSWORD",
    RESET_PASSWORD = "RESET_PASSWORD"
}

export interface ChangePasswordInput {
    type: ChangePasswordType;
    email?: string;
    accessToken?: string;
    oldPassword?: string;
    newPassword?: string;
};

export interface ChangeEmailInput {
    accessToken: string;
    newEmail: string;
};

export interface UserProfile {
    userId: string;
    email: string;
    fullname: string;
    user_photo?: string;
}

export type UpdateUserProfileInput  = UpdateUserInput;

export type UpdateTokenOutput = IssueTokenOutput;