import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    ChangePasswordCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
    UpdateUserAttributesCommand,
    InitiateAuthCommand,
    GetUserCommand,
    VerifyUserAttributeCommand,
    GetUserAttributeVerificationCodeCommand,
    DeleteUserCommand,
    AdminGetUserCommand,
    AdminGetUserCommandOutput,
    GetUserCommandOutput,
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthService } from "../AuthService";
import {
    VerifyChangePasswordInput,
    VerifyChangeUsernameInput,
    ResendUsernameVerificationCodeInput,
    ResendUsernameVerificationCodeOutput,
    IssueTokenInput,
    IssueTokenOutput,
    DeleteUserInput,
    ForgotPasswordInput,
    ForgotPasswordOutput,
    ChangeUsernameInput,
    ChangeUsernameOutput,
    VerifyForgotPasswordInput,
    ResendChangePasswordVerificationCodeInput,
    ResendChangePasswordVerificationCodeOutput,
    VerifySignUpInput,
    SignUpOutput,
    SignUpInput,
    ResendSignUpVerificationCodeInput,
    ResendSignUpVerificationCodeOutput,
    LogInInput,
    LogInOutput,
    GetUserInput,
    GetUserOutput,
    UpdateUserInput,
    ResetPasswordInput,
} from "../types";
import { AUTH_SERVICE_ERROR_CODE, convertCognitoError } from "../errors";
import { newAppErrorBuilder } from "@notes-app/common";

export interface CognitoAuthServiceConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    clientId: string;
    userPoolId: string;
}

export class CognitoAuthServiceImpl implements AuthService {
    private clientId: string;
    private userPoolId: string;
    private client: CognitoIdentityProviderClient;

    constructor(config: CognitoAuthServiceConfig) {
        this.clientId = config.clientId;
        this.userPoolId = config.userPoolId;
        this.client = new CognitoIdentityProviderClient({
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    /* Create User */

    // signup

    public async signup(input: SignUpInput): Promise<SignUpOutput> {
        const UserAttributes = [
            { Name: "email", Value: input.email },
            { Name: "name", Value: input.fullname },
        ];
        if (input.user_photo) {
            UserAttributes.push({ Name: "picture", Value: input.user_photo });
        }
        try {
            const { UserSub, UserConfirmed, CodeDeliveryDetails } = await this.client.send(
                new SignUpCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                    Password: input.password,
                    UserAttributes,
                })
            );
            return {
                userId: UserSub!,
                username: input.username,
                email: input.email,
                fullname: input.fullname,
                user_photo: input.user_photo,
                userConfirmed: UserConfirmed!,
                codeDeliveryEmail: CodeDeliveryDetails!.Destination,
            };
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async resendSignUpVerficationCode(input: ResendSignUpVerificationCodeInput): Promise<ResendSignUpVerificationCodeOutput> {
        try {
            const { CodeDeliveryDetails } = await this.client.send(
                new ResendConfirmationCodeCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                })
            );
            return { 
                codeDeliveryEmail: CodeDeliveryDetails!.Destination,
             };
        } catch (error) {
            const cognitoerror = convertCognitoError(error);
            if (cognitoerror.code === AUTH_SERVICE_ERROR_CODE.INVALID_PARAMETER) {
                throw newAppErrorBuilder()
                        .setHttpCode(400)
                        .setCode(AUTH_SERVICE_ERROR_CODE.USER_ALREADY_VERIFIED)
                        .addDetails({
                            description: "user already verified",
                        })
                        .build();
            }
            else {
                throw cognitoerror;
            }
        }
    }

    public async verifyRegister(input: VerifySignUpInput): Promise<void> {
        try {
            await this.client.send(
                new ConfirmSignUpCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                    ConfirmationCode: input.code,
                })
            );
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    /* Get User */

    // login

    public async login(input: LogInInput): Promise<LogInOutput> {
        try {
            const { AuthenticationResult } = await this.client.send(
                new InitiateAuthCommand({
                    AuthFlow: "USER_PASSWORD_AUTH",
                    ClientId: this.clientId,
                    AuthParameters: {
                        USERNAME: input.username,
                        PASSWORD: input.password,
                    },
                })
            );
            return {
                accessToken: AuthenticationResult?.AccessToken!,
                idToken: AuthenticationResult?.IdToken!,
                refreshToken: AuthenticationResult?.RefreshToken!,
                expiresIn: AuthenticationResult?.ExpiresIn!,
                expiresAt: this.calculateExpiresAt(AuthenticationResult?.ExpiresIn!),
            };
        } catch (error) {
            const cognitoerror = convertCognitoError(error);
            if (cognitoerror.code === AUTH_SERVICE_ERROR_CODE.NOT_AUTHORIZED) {
                throw newAppErrorBuilder()
                        .setHttpCode(401)
                        .setCode(AUTH_SERVICE_ERROR_CODE.INVALID_CREDENTIALS)
                        .addDetails("incorrect username and/or password")
                        .build()
            }
            throw cognitoerror;
        }
    }

    // get user info

    public async getUser(input: GetUserInput): Promise<GetUserOutput> {

        let output: GetUserCommandOutput | AdminGetUserCommandOutput | undefined;
        
        try {
            if (input.accessToken) {
                output = await this.getUserInfoByUser(input.accessToken);
            } else if (input.username) {
                output = await this.getUserInfoByAdmin(this.userPoolId, input.username);
            }
        }
        catch (error) {
            throw convertCognitoError(error);
        }
        
        if (!output) {
            throw newAppErrorBuilder()
                   .setHttpCode(400)
                   .setCode(AUTH_SERVICE_ERROR_CODE.INVALID_PARAMETER)
                   .addDetails({
                        description: "required either accessToken or username",
                        context: "getUserInfo",
                   })
                   .build();
        }

        const { UserAttributes } = output;
        const attributes = UserAttributes?.reduce<Record<string, string>>((acc, attr) => {
            acc[attr.Name] = attr.Value;
            return acc;
        }, {});

        return {
            userId: attributes?.sub!,
            username: attributes?.email!,
            email: attributes?.email!,
            fullname: attributes?.name!,
            user_photo: attributes?.picture,
        };
    }

    private async getUserInfoByAdmin(userPoolId: string, username: string): Promise<AdminGetUserCommandOutput> {
        return this.client.send(
            new AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: username,
            })
        );
    }

    private async getUserInfoByUser(accessToken: string): Promise<GetUserCommandOutput> {
        return await this.client.send(
            new GetUserCommand({
                AccessToken: accessToken,
            })
        );
    }

    /* Update User */

    // forgot password

    public async forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordOutput> {
        try {
            const { CodeDeliveryDetails } = await this.client.send(
                new ForgotPasswordCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                })
            );
            return { 
                codeDeliveryEmail: CodeDeliveryDetails!.Destination
            };
        }
        catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async verifyForgotPassword(input: VerifyForgotPasswordInput): Promise<void> {
        try {
            const response = await this.client.send(
                new ConfirmForgotPasswordCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                    ConfirmationCode: input.code,
                    Password: input.newPassword,
                })
            );
        }
        catch (error) {
            throw convertCognitoError(error);
        }
    }

    // reset password
    public async resetPassword(input: ResetPasswordInput): Promise<void> {
        try {
            await this.client.send(
                new ChangePasswordCommand({
                    AccessToken: input.accessToken,
                    PreviousPassword: input.oldPassword,
                    ProposedPassword: input.newPassword,
                })
            );
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async resendChangePasswordVerificationCode(input: ResendChangePasswordVerificationCodeInput): Promise<ResendChangePasswordVerificationCodeOutput> {
        try {
            const {CodeDeliveryDetails} = await this.client.send(
                new GetUserAttributeVerificationCodeCommand({
                    AccessToken: input.accessToken,
                    AttributeName: "password",
                })
            );
            return {
                codeDeliveryEmail: CodeDeliveryDetails!.Destination,
             };
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async verifyChangePassword(input: VerifyChangePasswordInput): Promise<void> {
        try {
            await this.client.send(
                new VerifyUserAttributeCommand({
                    AccessToken: input.accessToken,
                    AttributeName: "password",
                    Code: input.code,
                })
            );
            
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    // change username

    public async changeUsername(input: ChangeUsernameInput): Promise<ChangeUsernameOutput> {
        try {
            await this.client.send(
                new UpdateUserAttributesCommand({
                    AccessToken: input.accessToken,
                    UserAttributes: [
                        { Name: "email", Value: input.newUsername },
                    ],
                })
            );
            return {
                codeDeliveryEmail: input.newUsername,
            }
        }
        catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async resendUsernameVerificationCode(
        input: ResendUsernameVerificationCodeInput
    ): Promise<ResendUsernameVerificationCodeOutput> {
        try {
            const { CodeDeliveryDetails } = await this.client.send(
                new GetUserAttributeVerificationCodeCommand({
                    AccessToken: input.accessToken,
                    AttributeName: "email",
                })
            );
            return { 
                codeDeliveryEmail: CodeDeliveryDetails!.Destination,
            };
        }
        catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async verifyChangeUsername(input: VerifyChangeUsernameInput): Promise<void> {
        try {
            const response = await this.client.send(
                new VerifyUserAttributeCommand({
                    AccessToken: input.accessToken,
                    AttributeName: "email",
                    Code: input.code,
                })
            );
        }
        catch(error) {
            throw convertCognitoError(error);
        }
    }

    // update user info

    public async updateUserInfo(input: UpdateUserInput): Promise<void> {
        try {
            await this.client.send(
                new UpdateUserAttributesCommand({
                    AccessToken: input.accessToken,
                    UserAttributes: [
                        ...(input.fullname ? [{ Name: "name", Value: input.fullname }] : []),
                        ...(input.user_photo ? [{ Name: "picture", Value: input.user_photo }] : []),
                    ],
                })
            );
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    // generate new token

    public async issueToken(input: IssueTokenInput): Promise<IssueTokenOutput> {
        try {
            const { AuthenticationResult } = await this.client.send(
                new InitiateAuthCommand({
                    AuthFlow: "REFRESH_TOKEN_AUTH",
                    ClientId: this.clientId,
                    AuthParameters: {
                        REFRESH_TOKEN: input.refreshToken,
                    },
                })
            );
            return {
                accessToken: AuthenticationResult?.AccessToken!,
                idToken: AuthenticationResult?.IdToken!,
                refreshToken: AuthenticationResult?.RefreshToken,
                expiresIn: AuthenticationResult?.ExpiresIn!,
                expiresAt: this.calculateExpiresAt(AuthenticationResult?.ExpiresIn!),
            };
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    /* Delete User */

    public async deleteUser(input: DeleteUserInput): Promise<void> {
        try {
            const response = await this.client.send(
                new DeleteUserCommand({
                    AccessToken: input.accessToken,
                })
            );
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    /* Helper methods */
    private calculateExpiresAt(expiresIn: number): number {
        return Math.floor(Date.now() / 1000) + expiresIn;
    }
}