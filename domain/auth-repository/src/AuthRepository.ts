import { ChangeEmailInput, ChangePasswordInput, GetUserPhotoUploadUrlInput,
         GetUserPhotoUploadUrlOutput, RegisterUserInput, ResendVerificationCodeInput,
         UpdateTokenOutput, UpdateUserProfileInput, UserLogInInput, UserLogInOutput,
         GetUserProfileOutput, VerifyCodeInput, RegisterUserOutput, ResendVerificationCodeOutput,
         GetUserProfileInput, ForgotPasswordInput, ForgotPasswordOutput, ChangeEmailOutput,
         UpdateTokenInput,
         DeleteUserInput,
         UpdateUserProfileOutput
        } from "./types";

export interface AuthRepository {

    /* Sign Up */

    registerUser(input: RegisterUserInput): Promise<RegisterUserOutput>;

    /* Resend Verification Code */

    resendVerificationCode(input: ResendVerificationCodeInput): Promise<ResendVerificationCodeOutput>

    /* Code Verification */

    verifyCode(input: VerifyCodeInput): Promise<void>

    /* Get */

    userLogin(input: UserLogInInput): Promise<UserLogInOutput>;

    getUserProfile(input: GetUserProfileInput): Promise<GetUserProfileOutput>;

    getProfilePhotoUploadUrl(input: GetUserPhotoUploadUrlInput): Promise<GetUserPhotoUploadUrlOutput>;

    /* Update */

    forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordOutput>;

    changePassword(input: ChangePasswordInput): Promise<void>;

    changeEmail(input: ChangeEmailInput): Promise<ChangeEmailOutput>;

    updateUserProfile(input: UpdateUserProfileInput): Promise<UpdateUserProfileOutput>;

    removeProfilePhoto(accessToken: string): Promise<void>;

    updateTokens(input: UpdateTokenInput): Promise<UpdateTokenOutput>;

    /* Delete */

    deleteUser(input: DeleteUserInput): Promise<void>;
}