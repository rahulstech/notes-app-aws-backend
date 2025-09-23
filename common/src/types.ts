import { Request } from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

export interface ApiGatewayEvent {
    event?: APIGatewayProxyEvent;
    context?: Context;
}

export interface ApiGatewayRequest extends Request {
    apiGateway: ApiGatewayEvent;
}