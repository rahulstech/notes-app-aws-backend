import { AuthenticatedApiGatewayRequest, BaseRequest, UserClaimExtractorProvider } from "@notes-app/express-common";
import { AuthRepositoryFactory } from "@notes-app/auth-repository";
import { AuthRepository } from "@notes-app/auth-repository";

export interface AuthAppConfig {
    authRepositoryFactory: AuthRepositoryFactory;
    userClaimExtractorProvider: UserClaimExtractorProvider;
}

export interface AuthApiRequest extends BaseRequest, AuthenticatedApiGatewayRequest  {
    authRepository: AuthRepository;
    accessToken: string;
}