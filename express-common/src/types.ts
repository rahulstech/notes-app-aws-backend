import { Request } from "express";

export interface BaseRequest extends Request {
    validValue?: Record<string,any>;
}