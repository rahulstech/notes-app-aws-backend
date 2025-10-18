import { UserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import { Request } from "express";

const GUEST_USER_CLAIM: UserClaim = {
    userId: "GUEST",
    isGuest: true,
};

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {
    public getUserClaimExtractor(): UserClaimExtractor {
        return (req: Request): UserClaim | null => {
            return GUEST_USER_CLAIM;
        }
    }
}