import { configenv, LOGGER } from "@notes-app/common";
import { ApiGatewayUserClaimExtractor, DefaultUserClaimExtractor, UserClaim, UserClaimExtractorProvider } from "@notes-app/express-common";
import jwt from 'jsonwebtoken';
import { AuthApiRequest } from "../types";

const { NODE_ENV } = configenv();

function devUserClaimExtractor(req: AuthApiRequest): UserClaim | null {
    const accessToken = req.accessToken;
    LOGGER.logDebug(`obtain accessToken from request`, { tag: "devUserClaimExtractor", accessToken });

    if (!accessToken) {
        return null;
    }
    
    const payload = jwt.decode(req.accessToken);
    LOGGER.logInfo("decode accessToken", { tag: "devUserClaimExtractor", payload });

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