import { ChangeEmailInput, ChangePasswordInput, RegisterUserInput, ResendVerificationCodeInput, UpdateTokenOutput, UpdateUserProfileInput, UserLogInInput, UserLogInOutput, UserProfile, VerificationType, VerifyCodeInput } from "./types";
import { LogInOutput } from "../service/types";

export interface AuthRepository {


    registerUser(input: RegisterUserInput): Promise<string>;

    /* Resend Verification Code */

    resendVerificationCode(input: ResendVerificationCodeInput): Promise<string>

    /* Code Verification */

    verifyCode(input: VerifyCodeInput): Promise<void>

    /* login */

    userLogin(input: UserLogInInput): Promise<UserLogInOutput>;

    /* get user profile */

    getUserProfile(accessToken: string): Promise<UserProfile>;

    /* update user */

    changePassword(input: ChangePasswordInput): Promise<string | undefined>;

    changeEmail(input: ChangeEmailInput): Promise<string>;

    updateUserProfile(input: UpdateUserProfileInput): Promise<void>;

    updateTokens(refreshToken: string): Promise<UpdateTokenOutput>;

    /* delete user */

    deleteUser(accessToke: string): Promise<void>;
}