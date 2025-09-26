import { AuthService } from "./AuthService";

export interface AuthServiceFactory {
    
    createAuthService(): AuthService;
}