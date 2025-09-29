import { ENVIRONMENT } from "@notes-app/common";
import { ApiGatewayUserClaimExtractor, DefaultUserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import { Request } from "express";
import jwt from 'jsonwebtoken';

const { NODE_ENV } = ENVIRONMENT;

function devUserClaimExtractor(req: Request): UserClaim | null {
    const idToken = req.headers['x-id-token'];
    if (!idToken) {
        return null;
    }
    const payload = jwt.decode(idToken); // returns only payload
    if (!payload) {
        return null;
    }
    return {
        userId: payload.sub,
    }
}

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {

    public getApiGatewayUserClaimExtractor(): ApiGatewayUserClaimExtractor {
        if (NODE_ENV === 'prod') {
            return DefaultUserClaimExtractor;
        }
        return devUserClaimExtractor;
    }
}