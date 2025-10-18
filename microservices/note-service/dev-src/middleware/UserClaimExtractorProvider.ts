import { LOGGER } from "@notes-app/common";
import { UserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import { Request } from "express";
import jwt from 'jsonwebtoken';

const GUEST_USER_CLAIM: UserClaim = {
    userId: "GUEST",
    isGuest: true,
};

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {
    public getUserClaimExtractor(): UserClaimExtractor {
        return (req: Request): UserClaim | null => {
            const authHeader = req.headers.authorization || req.headers.Authorization;
            if (!authHeader || typeof authHeader !== "string") {
                return GUEST_USER_CLAIM;
            }

            const tokenType = (authHeader as string).slice(0,6);
            if (!tokenType || tokenType.toLowerCase() !== 'bearer') {
                return GUEST_USER_CLAIM;
            }
        
            const accessToken = (authHeader as string).slice(7); // remove "Bearer "
            try {
                const payload = jwt.decode(accessToken);
                if (payload) {
                    return {
                        userId: payload.sub,
                        isGuest: true,
                    };
                }
            }
            catch(error) {
                LOGGER.logError(error, { tag: "UserClaimExtractoryProviderImpl", method: "getUserClaimExtractor", env: process.env })
            }

            return GUEST_USER_CLAIM;
        }
    }
}