import { APP_ERROR_CODE, ENVIRONMENT, newAppErrorBuilder } from "@notes-app/common";
import { NextFunction, RequestHandler } from "express";
import { NoteApiExpressRequest } from "../types";

const { NODE_ENV } = ENVIRONMENT;

const isDev = NODE_ENV === 'dev';
const isProd = NODE_ENV === 'prod';

export interface UserClaim {
    userId: string;
}

function devClaimExtractor(req: NoteApiExpressRequest): UserClaim {
    return {
        userId: 'GUEST',
    };
}

function prodClaimExtractor(req: NoteApiExpressRequest): UserClaim {
    const claims = req.apiGateway?.event?.requestContext?.authorizer?.claims;
    if (claims) {
        return {
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
    return (req: NoteApiExpressRequest, _, next: NextFunction) => {
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