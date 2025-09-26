import { Request } from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

export interface ApiGatewayEvent {
    event?: APIGatewayProxyEvent;
    context?: Context;
}

export interface BaseRequest extends Request {
    validValue?: Record<string,any>;
}

export interface UserClaim {
    clientId: string,
    userId: string;
}

export interface AuthenticatedRequest extends BaseRequest {
    userClaim: UserClaim;
    apiGateway?: ApiGatewayEvent;
}