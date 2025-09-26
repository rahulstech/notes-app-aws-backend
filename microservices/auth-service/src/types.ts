import { BaseRequest } from "@notes-app/express-common";
import { AuthRepositoryFactory } from "./repository/AuthRepositoryFactory";
import { AuthRepository } from "./repository/AuthRepository";

export interface AuthAppConfig {
    authRepositoryFactory: AuthRepositoryFactory;
}

export interface AuthApiRequest extends BaseRequest {
    authRepository: AuthRepository;
}

export interface AuthApiAuthenticatedRequest extends AuthApiRequest {
    accessToken: string;
}