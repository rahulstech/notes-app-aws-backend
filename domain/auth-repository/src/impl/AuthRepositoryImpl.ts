import { APP_ERROR_CODE, LOGGER, newAppErrorBuilder } from "@notes-app/common";
import { AuthService } from "@notes-app/authentication";
import { LogInOutput } from "@notes-app/authentication";
import { NoteObjectService } from "@notes-app/storage-service";
import { NoteQueueService, QueueMessage, QueueMessageEventType, QueueMessageSourceType } from "@notes-app/queue-service";
import { AuthRepository } from "../AuthRepository";
import { convertAuthRepositoryError } from "../errors";
import { ChangeEmailInput, ChangeEmailOutput, ChangePasswordInput, 
    ForgotPasswordInput, 
    ForgotPasswordOutput, 
    GetUserPhotoUploadUrlInput, GetUserPhotoUploadUrlOutput,
    RegisterUserInput, ResendVerificationCodeInput, UpdateTokenOutput, 
    UpdateUserProfileInput, UserLogInInput, GetUserProfileOutput, VerificationType,
    VerifyCodeInput, 
    ResendVerificationCodeOutput,
    RegisterUserOutput,
    GetUserProfileInput,
    DeleteUserInput,
    UpdateTokenInput,
    UpdateUserProfileOutput
   } from "../types";

const LOG_TAG = "AuthRepository";
const DIR_PREFIX_USER_PHOTOS = "photos";
const USER_PHOTO_UPLOAD_URL_EXPIRES_IN = 3600; // 1 hour

export interface AuthRepositoryConfig {
    authService: AuthService;
    queryService: NoteQueueService;
    storageService: NoteObjectService;
}

export class AuthRepositoryImpl implements AuthRepository {

    private authService: AuthService;
    private queue: NoteQueueService;
    private storage: NoteObjectService;
    
    constructor(config: AuthRepositoryConfig) {
        this.authService = config.authService; 
        this.queue = config.queryService;
        this.storage = config.storageService;
    }

    public async registerUser(input: RegisterUserInput): Promise<RegisterUserOutput> {
        try {
            return await this.authService.signup({
                username: input.email,
                email: input.email,
                password: input.password,
                fullname: input.fullname,
            });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    /* Resend Verification Code */

    public async resendVerificationCode(input: ResendVerificationCodeInput): Promise<ResendVerificationCodeOutput> {
        let codeDeliveryEmail: string;
        switch (input.type) {
            case VerificationType.EMAIL:
                codeDeliveryEmail = await this.resendEmailCode(input);
            case VerificationType.FORGET_PASSWORD:
                codeDeliveryEmail = await this.resendForgetPasswordCode(input);
            case VerificationType.REGISTRATION:
                codeDeliveryEmail = await this.resendRegistrationCode(input);
        }
        return {
            type: input.type,
            codeDeliveryEmail
        }
    }

    private async resendEmailCode(input: ResendVerificationCodeInput): Promise<string> {
        if (!input.accessToken) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required accessToken",
                        context: "resendUsernameCode",
                    })
                    .build();
        }

        try {
            const { codeDeliveryEmail } = await this.authService.resendUsernameVerificationCode({ 
                accessToken: input.accessToken,
            });
            return codeDeliveryEmail;
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    private async resendForgetPasswordCode(input: ResendVerificationCodeInput): Promise<string> {
        if (!input.email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required email",
                        context: "resendForgetPasswordCode",
                    })
                    .build();
        }

        try {
            const { codeDeliveryEmail } = await this.authService.forgotPassword({ 
                username: input.email,
            });
            return codeDeliveryEmail;
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    private async resendRegistrationCode(input: ResendVerificationCodeInput): Promise<string> {
        if (!input.email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required email",
                        context: "resendRegistrationCode",
                    })
                    .build();
        }

        try {
            const { codeDeliveryEmail } = await this.authService.resendSignUpVerficationCode({ 
                username: input.email,
            });
            return codeDeliveryEmail;
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    /* Code Verification */

    public async verifyCode(input: VerifyCodeInput): Promise<void> {
        switch (input.type) {
            case VerificationType.EMAIL:
                return this.verifyEmail(input);
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
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required access token and code",
                        context: "verifyEmail",
                    })
                    .build();
        }

        try {
            return this.authService.verifyChangeUsername({ code, accessToken });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    private async verifyForgetPassword(input: VerifyCodeInput): Promise<void> {
        const { code, email, newPassword } = input;
        // requires the code, username and new password
        if (!code || !email || !newPassword) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required email, new password and code",
                        context: "verifyForgetPassword",
                    })
                    .build();
        }

        try {
            return this.authService.verifyForgotPassword({ code, username: email, newPassword });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    private async verifyRegistration(input: VerifyCodeInput): Promise<void> {
        const { code, email } = input;
        // requires the code, username and userId
        if (!code || !email) {
            throw newAppErrorBuilder()
                    .setHttpCode(400)
                    .setCode(APP_ERROR_CODE.BAD_REQUEST)
                    .addDetails({
                        description: "required email and code",
                        context: "verifyRegistration",
                    })
                    .build();
        }

        try {
            await this.authService.verifyRegister({ code, username: email });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    /* login */

    public async userLogin(input: UserLogInInput): Promise<LogInOutput> {
        return await this.authService.login({
            username: input.email,
            password: input.password,
        });
    }

    /* get user profile */

    public async getUserProfile(input: GetUserProfileInput): Promise<GetUserProfileOutput> {
        try {
            const output = await this.authService.getUser({ 
                accessToken: input.accessToken,
            });
            return {
                userId: output.userId,
                email: output.email,
                fullname: output.fullname,
                profile_photo: output.profile_photo,
            };
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    public async getProfilePhotoUploadUrl(input: GetUserPhotoUploadUrlInput): Promise<GetUserPhotoUploadUrlOutput> {
        try {
            const key = [DIR_PREFIX_USER_PHOTOS,input.userId,"profile-photo"].join('/');
            const output = await this.storage.getObjectUploadUrl({
                key,
                mime_type: input.type,
                size: input.size,
                expires_in: USER_PHOTO_UPLOAD_URL_EXPIRES_IN,
            });
            return {
                key,
                url: output.upload_url,
                http_method: output.upload_http_method,
                expiresIn: output.expires_in,
                expires: output.expire
            };
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    } 

    /* update user */

    // update password

    public async forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
        try {
            return await this.authService.forgotPassword({
                username: input.email
            });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    public async changePassword(input: ChangePasswordInput): Promise<void> {
        try {
            await this.authService.resetPassword({
                accessToken: input.accessToken,
                oldPassword: input.oldPassword, 
                newPassword: input.newPassword
            });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    // update email 

    public async changeEmail(input: ChangeEmailInput): Promise<ChangeEmailOutput> {
        try {
            return await this.authService.changeUsername({
                accessToken: input.accessToken,
                newUsername: input.newEmail,
            });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    // update profile

    public async updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput> {
        // if input contains profile_photo then check the key exists or not
        if (input.profile_photo) {
            let exists = false;
            try {
                exists = await this.storage.isKeyExists(input.profile_photo);
            }
            catch(error) {
                throw convertAuthRepositoryError(error);
            }
            if (!exists) {
                throw newAppErrorBuilder()
                        .setHttpCode(400)
                        .setCode(APP_ERROR_CODE.NOT_FOUND)
                        .addDetails({
                            description: "profile photo does not exists",
                            context: "updateUserProfile",
                            reason: input.profile_photo
                        })
                        .build()

            }
            const url = this.storage.getMediaUrl(input.profile_photo);
            input.profile_photo = url;
        }

        try {
            await this.authService.updateUser(input);
            return {
                fullname: input.fullname,
                profile_photo: input.profile_photo,
            };
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    // remove profile photo

    public async removeProfilePhoto(accessToken: string): Promise<void> {
        const { profile_photo } = await this.getUserProfile({ accessToken });

        // if profile_photo exists then enuque delete event
        if (profile_photo) {
            // remove profile photo from db
            await this.updateUserProfile({
                accessToken,
                profile_photo: "",
            });

            // enqueue a delete profile photo event
            this.enqueueDeleteProfilePhoto(profile_photo);
        }
    }

    private async enqueueDeleteProfilePhoto(profilePhoto: string): Promise<void> {
        const message: QueueMessage = {
            source_type: QueueMessageSourceType.AUTH_SERVICE,
            event_type: QueueMessageEventType.DELETE_PROFILE_PHOTO,
            body: {
                key: this.storage.getObjectKeyFromMediaUrl(profilePhoto)
            }
        };
        try {
            await this.queue.enqueueMessage(message);
        }
        catch(error) {
            LOGGER.logFatal(error,{ tag: LOG_TAG, method: "enqueueDeleteProfilePhoto", profilePhoto });
        }
    }

    // regenerate tokens

    public async updateTokens(input: UpdateTokenInput): Promise<UpdateTokenOutput> {
        try {
            return await this.authService.issueToken({ 
                refreshToken: input.refreshToken
            });
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
    }

    /* delete user */

    public async deleteUser(input: DeleteUserInput): Promise<void> {
        try {
            const { userId } = await this.authService.getUser({ 
                accessToken: input.accessToken
            });
    
            await this.authService.deleteUser({ 
                accessToken: input.accessToken 
            });
    
            this.enqueueDeleteUser(userId);
        }
        catch(error) {
            throw convertAuthRepositoryError(error);
        }
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
            LOGGER.logFatal(error, { tag: LOG_TAG, method: "enqueueDeleteUser", userId });
        }
    }
}