import {
    ResetPasswordInput,
    VerifyChangePasswordInput,
    ChangeUsernameInput, ChangeUsernameOutput,
    VerifyChangeUsernameInput,
    DeleteUserInput,
    IssueTokenInput,
    IssueTokenOutput,
    ResendUsernameVerificationCodeOutput,
    ResendUsernameVerificationCodeInput,
    ForgotPasswordInput,
    ForgotPasswordOutput,
    VerifyForgotPasswordInput,
    ResendChangePasswordVerificationCodeInput,
    ResendChangePasswordVerificationCodeOutput,
    SignUpInput,
    SignUpOutput,
    ResendSignUpVerificationCodeInput,
    ResendSignUpVerificationCodeOutput,
    VerifySignUpInput,
    LogInInput,
    LogInOutput,
    GetUserInput,
    GetUserOutput,
    UpdateUserInput
  } from "./types";
  
  export interface AuthService {

    // sisgnup
  
    signup(input: SignUpInput): Promise<SignUpOutput>;

    resendSignUpVerficationCode(input: ResendSignUpVerificationCodeInput): Promise<ResendSignUpVerificationCodeOutput>;
  
    verifyRegister(input: VerifySignUpInput): Promise<void>;

    // login 

    login(input: LogInInput): Promise<LogInOutput>;
  
    // get user

    getUser(input: GetUserInput): Promise<GetUserOutput>;
  
    /* update user */

    // forget password

    forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordOutput>;

    verifyForgotPassword(input: VerifyForgotPasswordInput): Promise<void>;

    // forget password

    resetPassword(input: ResetPasswordInput): Promise<void>;

    resendChangePasswordVerificationCode(input: ResendChangePasswordVerificationCodeInput): Promise<ResendChangePasswordVerificationCodeOutput>;
  
    verifyChangePassword(input: VerifyChangePasswordInput): Promise<void>;

    // change username

    changeUsername(input: ChangeUsernameInput): Promise<ChangeUsernameOutput>;

    resendUsernameVerificationCode(input: ResendUsernameVerificationCodeInput): Promise<ResendUsernameVerificationCodeOutput>;
  
    verifyChangeUsername(input: VerifyChangeUsernameInput): Promise<void>;
  
    // update user info

    updateUserInfo(input: UpdateUserInput): Promise<void>;

    // generate new tokens

    issueToken(input: IssueTokenInput): Promise<IssueTokenOutput>;
  
    // delete user

    deleteUser(input: DeleteUserInput): Promise<void>;
  }
  