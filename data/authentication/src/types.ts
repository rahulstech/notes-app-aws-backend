// Base Interfaces
interface AuthenticatedInput {
    accessToken: string;
}

interface TokenOutput {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number; // access and id token expiration duration in second
    expiresAt: number; // access and id token expiration timestamp in second
}

interface VertificationCodeOutput {
    codeDeliveryEmail: string;
}

// Signup
export interface SignUpInput {
    username: string;          // usually same as email
    password: string;
    email: string;
    fullname: string;
}

export interface SignUpOutput extends VertificationCodeOutput {
    userId: string;            // Cognito sub
    username: string;
    email: string;
    fullname: string;
    userConfirmed: boolean;    // whether account is confirmed
}

// Verify Register (Confirm SignUp)
export interface VerifySignUpInput {
    username: string;
    code: string;
}

// Resend Registration Verification Code
export interface ResendSignUpVerificationCodeInput {
    username: string;
}

export interface ResendSignUpVerificationCodeOutput extends VertificationCodeOutput {}

// Login
export interface LogInInput {
    username: string;
    password: string;
}

export interface LogInOutput extends TokenOutput {}

// Get User Info
export interface GetUserInput {
    // for user use
    accessToken?: string;
    // for admin use
    username?: string;
}

export interface GetUserOutput {
    userId: string;
    username: string;
    email: string;
    fullname: string;
    profile_photo?: string;
}

// Forgot Password
export interface ForgotPasswordInput {
    username: string;
}

export interface ForgotPasswordOutput extends VertificationCodeOutput {}

// Verify Forgot Password
export interface VerifyForgotPasswordInput {
    username: string;
    code: string;
    newPassword: string;
}

// Reset Password
export interface ResetPasswordInput extends AuthenticatedInput {
    oldPassword: string;
    newPassword: string;
}

// Verify Change Password (Force new password)
export interface VerifyChangePasswordInput extends AuthenticatedInput {
    code: string;
}

// Resend Password Verification Code
export interface ResendChangePasswordVerificationCodeInput extends AuthenticatedInput {}

export interface ResendChangePasswordVerificationCodeOutput extends VertificationCodeOutput {}

// Change Username
export interface ChangeUsernameInput extends AuthenticatedInput {
    newUsername: string;
}

export interface ChangeUsernameOutput extends VertificationCodeOutput {}

// Verify Change Username
export interface VerifyChangeUsernameInput extends AuthenticatedInput {
    code: string;
}

// Resend Registration Verification Code
export interface ResendUsernameVerificationCodeInput extends AuthenticatedInput {}

export interface ResendUsernameVerificationCodeOutput extends VertificationCodeOutput {}

// Update User Info
export interface UpdateUserInput extends Partial<AuthenticatedInput> {
    fullname?: string;
    profile_photo?: string | null;
    userId?: string;
}

// Issue Token
export interface IssueTokenInput {
    refreshToken: string;
    username: string;
}

export interface IssueTokenOutput extends TokenOutput {}

// Delete User
export interface DeleteUserInput extends AuthenticatedInput {}
