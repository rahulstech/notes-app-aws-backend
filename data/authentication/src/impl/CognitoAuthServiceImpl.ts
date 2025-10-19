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
    AdminUpdateUserAttributesCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { AuthService } from "../AuthService";
import {
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
import { APP_ERROR_CODE, LOGGER, newAppErrorBuilder } from "@notes-app/common";
import { createHmac } from "node:crypto";

const LOG_TAG = "CognitoAuthServiceImpl";

export interface CognitoAuthServiceConfig {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    userPoolId: string;
    clientId: string;
    clientSecret: string;
}

export class CognitoAuthServiceImpl implements AuthService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly userPoolId: string;
    private readonly client: CognitoIdentityProviderClient;

    constructor(config: CognitoAuthServiceConfig) {
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
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
        try {
            const { UserSub, UserConfirmed } = await this.client.send(
                new SignUpCommand({
                    ClientId: this.clientId,
                    Username: input.username,
                    Password: input.password,
                    UserAttributes,
                    SecretHash: this.generateSecretHash(input.username),
                })
            );
            return {
                userId: UserSub!,
                username: input.username,
                email: input.email,
                fullname: input.fullname,
                userConfirmed: UserConfirmed!,
                // enable "Attribute Verification and user account confirmnation" in cognito user pool
                // otherwise no signup code will be sent
                codeDeliveryEmail: input.email, 
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
                    SecretHash: this.generateSecretHash(input.username),
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
                    SecretHash: this.generateSecretHash(input.username),
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
                        SECRET_HASH: this.generateSecretHash(input.username),
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
                   .setCode(APP_ERROR_CODE.BAD_REQUEST)
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
            profile_photo: attributes?.picture,
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
                    SecretHash: this.generateSecretHash(input.username),
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
                    SecretHash: this.generateSecretHash(input.username),
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

    // change username

    public async changeUsername(input: ChangeUsernameInput): Promise<ChangeUsernameOutput> {
        try {
            const { CodeDeliveryDetailsList } = await this.client.send(
                new UpdateUserAttributesCommand({
                    AccessToken: input.accessToken,
                    UserAttributes: [
                        { Name: "email", Value: input.newUsername },
                    ],
                })
            );
            return {
                codeDeliveryEmail: CodeDeliveryDetailsList[0].Destination,
            }
        }
        catch (error) {
            throw convertCognitoError(error);
        }
    }

    public async resendUsernameVerificationCode(input: ResendUsernameVerificationCodeInput): Promise<ResendUsernameVerificationCodeOutput> {
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

    public async updateUser(input: UpdateUserInput): Promise<void> {
        const UserAttributes = [];
        if (input.fullname) {
            UserAttributes.push({ Name: "name", Value: input.fullname });
        }
        if (input.profile_photo !== undefined) {
            const picture = !input.profile_photo ? "" : input.profile_photo;
            UserAttributes.push({ Name: "picture", Value: picture });
        }
        if (UserAttributes.length === 0) {
            LOGGER.logInfo('no attribute to update', { tag: LOG_TAG, method: 'updateUser'});
            return;
        }

        LOGGER.logDebug('update user', { tag: LOG_TAG, UserAttributes });

        // if userId exists then update via admin control
        // if accessToken exists then update via user control
        // first check for accessToken then userId
        let cmd: any;
        if (input.accessToken) {
            cmd = new UpdateUserAttributesCommand({
                AccessToken: input.accessToken,
                UserAttributes,
            });
        }
        else if (input.userId) {
            cmd = new AdminUpdateUserAttributesCommand({
                UserPoolId: this.userPoolId,
                Username: input.userId,
                UserAttributes,
            })
        }
        else {
            throw newAppErrorBuilder()
                    .setHttpCode(401)
                    .setCode(APP_ERROR_CODE.UNAUTHORIZED)
                    .addDetails({
                        description: "either userId or accessToken is required",
                        context: "CognitoAuthServiceImpl#updateUser"
                    })
                    .build();
        }

        try {
            await this.client.send(cmd);
        } catch (error) {
            throw convertCognitoError(error);
        }
    }

    // generate new token

    public async issueToken(input: IssueTokenInput): Promise<IssueTokenOutput> {
        LOGGER.logDebug("issue new token", { tag: LOG_TAG, method: "issueToken", input });
        
        try {
            const { AuthenticationResult } = await this.client.send(
                new InitiateAuthCommand({
                    AuthFlow: "REFRESH_TOKEN_AUTH",
                    ClientId: this.clientId,
                    AuthParameters: {
                        REFRESH_TOKEN: input.refreshToken,
                        SECRET_HASH: this.generateSecretHash(input.username),
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
            await this.client.send(
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

    private generateSecretHash(username: string): string {
        return createHmac('SHA256', this.clientSecret)
                .update(username + this.clientId)
                .digest('base64');
    }
}