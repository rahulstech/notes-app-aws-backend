import { ENVIRONMENT, LOGGER } from "@notes-app/common";
import { NextFunction, RequestHandler } from "express";
import { NoteApiExpressRequest, UserClaim } from "../types";

const { NODE_ENV } = ENVIRONMENT;

const isDev = NODE_ENV === 'dev';
const isProd = NODE_ENV === 'prod';

const GUEST_USERCLAIM: UserClaim = {
    userId: 'GUEST',
};

function devClaimExtractor(req: NoteApiExpressRequest): UserClaim {
    return GUEST_USERCLAIM;
}

function prodClaimExtractor(req: NoteApiExpressRequest): UserClaim {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.claims;
    if (claims) {
        const { sub } = claims;
        return {
            userId: sub,
        }
    }
    return GUEST_USERCLAIM;
}

export function extractUserClaim(): RequestHandler {
    return (req:NoteApiExpressRequest, _, next: NextFunction) => {
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