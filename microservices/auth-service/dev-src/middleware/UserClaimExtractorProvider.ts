import { LOGGER } from "@notes-app/common";
import { UserClaimExtractor, UserClaimExtractorProvider } from "@notes-app/express-common";
import jwt from 'jsonwebtoken';
import { AuthApiRequest } from "../../src/types";

export class UserClaimExtractorProviderImpl implements UserClaimExtractorProvider {

    public getUserClaimExtractor(): UserClaimExtractor {
        return (req: AuthApiRequest)=>{
            const accessToken = req.accessToken;
            LOGGER.logDebug(`obtain accessToken from request`, { tag: "devUserClaimExtractor", accessToken });

            if (!accessToken) {
                return null;
            }
            
            const payload = jwt.decode(req.accessToken);
            LOGGER.logInfo("decode accessToken", { tag: "devUserClaimExtractor", payload });

            return {
                userId: payload.sub,
                isGuest: false,
            };
        }
    }
}