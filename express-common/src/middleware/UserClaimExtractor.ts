import { NextFunction, RequestHandler } from "express";
import { AuthenticatedApiGatewayRequest, UserClaim } from "../types";
import { APP_ERROR_CODE, newAppErrorBuilder } from "@notes-app/common";

export function extractUserClaim(): RequestHandler {
    return (req: AuthenticatedApiGatewayRequest,_,next: NextFunction) => {
        const extractor = req.userClaimExtractor;
        const userClaim: UserClaim | null = extractor(req);
        if (!userClaim) {
            throw newAppErrorBuilder()
                .setHttpCode(401)
                .setCode(APP_ERROR_CODE.UNAUTHORIZED)
                .addDetails('unauthorized - invalid user claim')
                .build();
        }
        req.userClaim = userClaim;
        next();
    }
}