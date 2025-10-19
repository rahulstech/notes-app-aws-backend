import { Request } from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { LOGGER } from "@notes-app/common";

export interface BaseRequest extends Request {
    validValue?: Record<string,any>;
}

export interface ApiGatewayEvent {
    event?: APIGatewayProxyEvent;
    context?: Context;
}

export interface ApiGatewayRequest extends Request {
    apiGateway: ApiGatewayEvent;
}

export interface UserClaim {
    userId: string;
    isGuest: boolean;
}

export type UserClaimExtractor = (req: Request)=>UserClaim | null;

export const ApiGatewayUserClaimExtractor: UserClaimExtractor = (req: Request): UserClaim | null => {
    const apiGateway = (req as ApiGatewayRequest).apiGateway;
    if (!apiGateway) {
        LOGGER.logWarn("no ApiGatewayEvent found",{ tag: "ApiGatewayUserClaimExtractor"});
        return null;
    }
    const authorizer = apiGateway.event?.requestContext?.authorizer;
    // If i use API Gatewat v1 (REST Api) then claims are directly under authorizer
    // i.e. apiGateway.event.requestContext.authorizer.claims
    // If i use API Gateway v2 (HTTP Api) then claims are under jwt inside authorizer
    // i.e. apiGateway.event.requestContext.authorizer.jwt.claims
    const claims = authorizer?.claims || authorizer?.jwt?.claims;
    if (!claims) {
        LOGGER.logWarn("ApiGatewayEvent does not contain claims",{ tag: "ApiGatewayUserClaimExtractor"});
        return null;
    }
    return {
        userId: claims.sub,
        isGuest: false,
    };
}

export interface UserClaimExtractorProvider {
    getUserClaimExtractor(): UserClaimExtractor;
}

export interface AuthenticatedApiGatewayRequest extends ApiGatewayRequest {
    userClaim: UserClaim;
    userClaimExtractor: UserClaimExtractor;
}