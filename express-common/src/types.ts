import { Request } from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

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
}

export type ApiGatewayUserClaimExtractor = (req: Request)=>UserClaim | null;

export const DefaultUserClaimExtractor: ApiGatewayUserClaimExtractor = (req: Request): UserClaim | null => {
    const apiGateway = (req as ApiGatewayRequest).apiGateway;
    if (!apiGateway) {
        return null;
    }
    const claims = apiGateway.event?.requestContext?.authorizer?.claims;
    if (!claims) {
        return null;
    }
    return {
        userId: claims.sub,
    }
}

export interface UserClaimExtractorProvider {
    getApiGatewayUserClaimExtractor(): ApiGatewayUserClaimExtractor;
}

export interface AuthenticatedApiGatewayRequest extends ApiGatewayRequest {
    userClaim: UserClaim;
    userClaimExtractor: ApiGatewayUserClaimExtractor;
}