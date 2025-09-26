import { AuthRepository } from "./AuthRepository";

export interface AuthRepositoryFactory {

    createAuthRepository(): AuthRepository;
}