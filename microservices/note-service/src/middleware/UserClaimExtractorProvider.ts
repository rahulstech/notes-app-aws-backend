import { UserClaimExtractor, UserClaimExtractorProvider, ApiGatewayUserClaimExtractor } from "@notes-app/express-common";

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {
    public getUserClaimExtractor(): UserClaimExtractor {
        return ApiGatewayUserClaimExtractor;
    }
}