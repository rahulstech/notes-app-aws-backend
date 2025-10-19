import { configenv } from "@notes-app/common";
import { AuthService } from "../AuthService";
import { AuthServiceFactory } from "../AuthServiceFactory";
import { CognitoAuthServiceImpl } from "./CognitoAuthServiceImpl";

const {
    AWS_ID,
    AWS_SECRET,
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
    COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET,
} = configenv();

export class AuthServiceFactoryImpl implements AuthServiceFactory {

    constructor() {}

    public createAuthService(): AuthService {
        return new CognitoAuthServiceImpl({
            accessKeyId: AWS_ID,
            secretAccessKey: AWS_SECRET,
            region: COGNITO_REGION,
            userPoolId: COGNITO_USER_POOL_ID,
            clientId: COGNITO_CLIENT_ID,
            clientSecret: COGNITO_CLIENT_SECRET,
        })
    }
}