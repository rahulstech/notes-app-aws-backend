import { NoteQueueService, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";
import { ChangeEmailInput, ChangePasswordInput, ChangePasswordType, RegisterUserInput, ResendVerificationCodeInput, UpdateTokenOutput, UpdateUserProfileInput, UserLogInInput, UserProfile, VerificationType, VerifyCodeInput } from "../types";
import { AuthService } from "../../service/AuthService";
import { AuthRepository } from "../AuthRepository";
import { AppError, LOGGER, newAppErrorBuilder } from "@notes-app/common";
import { AUTH_REPOSITORY_ERROR_CODE } from "../errors";
import { ForgotPasswordOutput, LogInOutput } from "../../service/types";
import { AUTH_SERVICE_ERROR_CODE } from "../../service/errors";

const LOG_TAG = "AuthRepository";

export interface AuthRepositoryConfig {
    authService: AuthService;
    queryService: NoteQueueService;
}

export class AuthRepositoryImpl implements AuthRepository {

    private authService: AuthService;
    private queue: NoteQueueService;
    
    constructor(config: AuthRepositoryConfig) {
        this.authService = config.authService; 
        this.queue = config.queryService;
    }

    public async registerUser(input: RegisterUserInput): Promise<string> {
        const { codeDeliveryEmail } = await this.authService.signup({
            username: input.email,
            email: input.email,
            password: input.password,
            fullname: input.fullname,
            user_photo: input.user_photo,
        });
        return codeDeliveryEmail;
    }

    /* Resend Verification Code */

    public async resendVerificationCode(input: ResendVerificationCodeInput): Promise<string> {
        switch (input.type) {
            case VerificationType.EMAIL:
                return this.resendEmailCode(input);
            case VerificationType.RESET_PASSWORD:
                return this.resendResetPasswordCode(input);
            case VerificationType.FORGET_PASSWORD:
                return this.resendForgetPasswordCode(input);
            case VerificationType.REGISTRATION:
                return this.resendRegistrationCode(input);
        }
    }

    private async resendEmailCode(input: ResendVerificationCodeInput): Promise<string> {
        const { accessToken } = input;
        // requires the access token
        if (!accessToken) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required accessToken",
                        context: "resendUsernameCode",
                    })
                    .build();
        }

        const { codeDeliveryEmail } = await this.authService.resendUsernameVerificationCode({ accessToken });
        return codeDeliveryEmail;
    }

    private async resendResetPasswordCode(input: ResendVerificationCodeInput): Promise<string> {
        const { accessToken } = input;
        // requires the access token
        if (!accessToken) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required accessToken",
                        context: "resendResetPasswordCode",
                    })
                    .build();
        }

        const { codeDeliveryEmail } = await this.authService.resendChangePasswordVerificationCode({ accessToken });
        return codeDeliveryEmail;
    }

    private async resendForgetPasswordCode(input: ResendVerificationCodeInput): Promise<string> {
        const { email } = input;
        // requires the username
        if (!email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required email",
                        context: "resendForgetPasswordCode",
                    })
                    .build();
        }

        const { codeDeliveryEmail } = await this.authService.forgotPassword({ 
            username: email,
         });
        return codeDeliveryEmail;
    }

    private async resendRegistrationCode(input: ResendVerificationCodeInput): Promise<string> {
        const { email } = input;
        // requires the username
        if (!email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required email",
                        context: "resendRegistrationCode",
                    })
                    .build();
        }

        try {
            const { codeDeliveryEmail } = await this.authService.resendSignUpVerficationCode({ 
                username: email,
            });
            return codeDeliveryEmail;
        }
        catch(error) {
            throw error;
        }
    }

    /* Code Verification */

    public async verifyCode(input: VerifyCodeInput): Promise<void> {
        switch (input.type) {
            case VerificationType.EMAIL:
                return this.verifyEmail(input);
            case VerificationType.RESET_PASSWORD:
                return this.verifyResetPassword(input);
            case VerificationType.FORGET_PASSWORD:
                return this.verifyForgetPassword(input);
            case VerificationType.REGISTRATION:
                return this.verifyRegistration(input);
        }
    }

    private async verifyEmail(input: VerifyCodeInput): Promise<void> {
        const { accessToken, code } = input;
        // requires the code and access token
        if (!code || !accessToken) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required access token and code",
                        context: "verifyEmail",
                    })
                    .build();
        }

        return this.authService.verifyChangeUsername({ code, accessToken });
    }

    private async verifyResetPassword(input: VerifyCodeInput): Promise<void> {
        const { code, accessToken } = input;
        // requires the code and access token
        if (!code || !accessToken) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required accessToken and code",
                        context: "verifyResetPassword",
                    })
                    .build();
        }

        return this.authService.verifyChangePassword({ code, accessToken });
    }

    private async verifyForgetPassword(input: VerifyCodeInput): Promise<void> {
        const { code, email, newPassword } = input;
        // requires the code, username and new password
        if (!code || !email || !newPassword) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required email, new password and code",
                        context: "verifyForgetPassword",
                    })
                    .build();
        }

        return this.authService.verifyForgotPassword({ code, username: email, newPassword });
    }

    private async verifyRegistration(input: VerifyCodeInput): Promise<void> {
        const { code, email } = input;
        // requires the code, username and userId
        if (!code || !email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(AUTH_REPOSITORY_ERROR_CODE.INVALID_PARAMETER)
                    .addDetails({
                        description: "required email and code",
                        context: "verifyRegistration",
                    })
                    .build();
        }

        // verify the code
        await this.authService.verifyRegister({ code, username: email });
    }

    /* login */

    public async userLogin(input: UserLogInInput): Promise<LogInOutput> {
        return await this.authService.login({
            username: input.email,
            password: input.password,
        });
    }

    /* get user profile */

    public async getUserProfile(accessToken: string): Promise<UserProfile> {
        const output = await this.authService.getUser({ accessToken });
        return {
            userId: output.userId,
            email: output.email,
            fullname: output.fullname,
            user_photo: output.user_photo,
        }
    }

    /* update user */

    public async changePassword(input: ChangePasswordInput): Promise<string | undefined> {
        switch(input.type) {
            case ChangePasswordType.FORGET_PASSWORD: {
                const { codeDeliveryEmail } = await this.forgotPassword(input.email!);
                return codeDeliveryEmail;
            }
            case ChangePasswordType.RESET_PASSWORD: {
                await this.resetPassword(input.accessToken, input.oldPassword, input.newPassword);
            }
        }
    }

    private async forgotPassword(username: string): Promise<ForgotPasswordOutput> {
        return this.authService.forgotPassword({
            username,
        });
    }

    private async resetPassword(accessToken: string, oldPassword: string, newPassword: string): Promise<void> {
        this.authService.resetPassword({
            accessToken, oldPassword, newPassword
        });
    }

    public async changeEmail(input: ChangeEmailInput): Promise<string> {
        try {
            const { codeDeliveryEmail } = await this.authService.changeUsername({
                accessToken: input.accessToken,
                newUsername: input.newEmail,
            });
            return codeDeliveryEmail;
        }
        catch(error) {
            const autherror = error as AppError;
            if (autherror.code === AUTH_SERVICE_ERROR_CODE.USERNAME_EXISTS) {
                throw newAppErrorBuilder()
                        .copy(autherror)
                        .setDetails([{
                            description: "email in use"
                        }])
                        .build();
            }
            else {
                throw error;
            }
        }
    }

    public async updateUserProfile(input: UpdateUserProfileInput): Promise<void> {
        await this.authService.updateUserInfo(input);
    }

    public async updateTokens(refreshToken: string): Promise<UpdateTokenOutput> {
        return await this.authService.issueToken({ refreshToken });
    }

    /* delete user */

    public async deleteUser(accessToken: string): Promise<void> {
        const { userId } = await this.authService.getUser({ accessToken });

        await this.authService.deleteUser({ accessToken });

        this.enqueueDeleteUser(userId);
    }

    private async enqueueDeleteUser(userId: string) {
        try {
            await this.queue.enqueueMessage({
                source_type: QueueMessageSourceType.AUTH_SERVICE,
                event_type: QueueMessageEventType.DELETE_USER,
                body: { 
                    userId,
                }
            });
        }
        catch(error) {
            LOGGER.logFatal(error, { tag: LOG_TAG, method: "enqueueDeleteUser" })
        }
    }
}