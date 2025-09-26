import { APP_ERROR_CODE, ENVIRONMENT, newAppErrorBuilder } from "@notes-app/common";
import { NextFunction, RequestHandler } from "express";
import { AuthenticatedRequest, UserClaim } from "../types";

const { NODE_ENV } = ENVIRONMENT;

const isDev = NODE_ENV === 'dev';
const isProd = NODE_ENV === 'prod';

function devClaimExtractor(req: AuthenticatedRequest): UserClaim {
    return {
        clientId: 'DEV_CLIENT',
        userId: 'GUEST',
    };
}

function prodClaimExtractor(req: AuthenticatedRequest): UserClaim {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.claims;
    if (claims) {
        return {
            clientId: claims.aud,
            userId: claims.sub,
        }
    }
    throw newAppErrorBuilder()
            .setHttpCode(401)
            .setCode(APP_ERROR_CODE.UNAUTHORIZED)
            .addDetails('unauthorized - invalid user claim')
            .build();
}

export function extractUserClaim(): RequestHandler {
    return (req: AuthenticatedRequest, _, next: NextFunction) => {
        let userClaim: UserClaim | undefined;
        if (isDev) {
            userClaim = devClaimExtractor(req);
        }
        else if (isProd) {
            userClaim = prodClaimExtractor(req);
        }
        req.userClaim = userClaim;
        next();
    }
}