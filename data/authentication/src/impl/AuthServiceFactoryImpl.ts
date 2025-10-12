import { configenv } from "@notes-app/common";
import { AuthService } from "../AuthService";
import { AuthServiceFactory } from "../AuthServiceFactory";
import { CognitoAuthServiceImpl } from "./CognitoAuthServiceImpl";

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    COGNITO_REGION,
    COGNITO_CLIENT_ID,
    COGNITO_USER_POOL_ID,
} = configenv();

export class AuthServiceFactoryImpl implements AuthServiceFactory {

    constructor() {}

    public createAuthService(): AuthService {
        return new CognitoAuthServiceImpl({
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
            region: COGNITO_REGION,
            clientId: COGNITO_CLIENT_ID,
            userPoolId: COGNITO_USER_POOL_ID,
        })
    }
}