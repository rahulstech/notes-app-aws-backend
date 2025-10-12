import { configenv } from "@notes-app/common";
import { ApiGatewayUserClaimExtractor, DefaultUserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import { Request } from "express";
import jwt from 'jsonwebtoken';

const { NODE_ENV } = configenv();

const GUEST_USER_CLAIM: UserClaim = {
    userId: "GUEST",
} 

function devUserClaimExtractor(req: Request): UserClaim | null {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== "string") {
        return GUEST_USER_CLAIM;
    }

    const tokenType = (authHeader as string).slice(0,6);
    if (tokenType || tokenType.toLowerCase() !== 'bearer') {
        return GUEST_USER_CLAIM;
    }
  
    const accessToken = (authHeader as string).slice(7); // remove "Bearer "
    try {
        const payload = jwt.decode(accessToken);
        if (payload) {
            return {
                userId: payload.sub,
            };
        }
    }
    catch {}

    return GUEST_USER_CLAIM;
}

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {
    public getApiGatewayUserClaimExtractor(): ApiGatewayUserClaimExtractor {
        if (NODE_ENV === 'prod') {
            return DefaultUserClaimExtractor;
        }
        return devUserClaimExtractor;
    }
}