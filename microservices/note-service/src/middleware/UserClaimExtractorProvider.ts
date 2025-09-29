import { ENVIRONMENT } from "@notes-app/common";
import { ApiGatewayUserClaimExtractor, DefaultUserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import { Request } from "express";

const { NODE_ENV } = ENVIRONMENT;

function devUserClaimExtractor(req: Request): UserClaim | null {
    return {
        userId: 'GUEST',
    };
}

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {
    public getApiGatewayUserClaimExtractor(): ApiGatewayUserClaimExtractor {
        if (NODE_ENV === 'prod') {
            return DefaultUserClaimExtractor;
        }
        return devUserClaimExtractor;
    }
}