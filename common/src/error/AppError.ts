import { STATUS_CODES } from "node:http";
import { createAppErrorItem } from "../util/helpers";

export interface AppErrorItem {
    description: string,
    context?: string,
}

export class AppError extends Error {
    
    constructor(
        public httpCode: number,
        public code: number = httpCode,
        public details: AppErrorItem[] = [],
        public operational: boolean = true
    ) {
        super();
        this.name = this.constructor.name;
    }

    public appendDetails(item: AppErrorItem) {
        this.details.push(item)
    }
}

export class AppErrorBuilder {

    private details: AppErrorItem[] = []
    private operational: boolean = true
    private httpCode: number = 500
    private code?: number

    constructor(){}

    public copy(src: AppError): AppErrorBuilder {
        this.httpCode = src.httpCode
        this.code = src.code
        this.details = src.details
        this.operational = src.operational
        return this
    }

    public setCode(code: number): AppErrorBuilder {
        this.code = code
        return this
    }

    public setHttpCode(httpCode: number): AppErrorBuilder {
        this.httpCode = httpCode
        return this
    }

    public addDetails(details: string | Error | AppErrorItem): AppErrorBuilder {
        if (typeof details === 'string' || details instanceof Error) {
            this.details.push(createAppErrorItem(details))
        }
        else {
            this.details.push(details)
        }
        return this
    }

    public setDetails(details: AppErrorItem[]): AppErrorBuilder {
        this.details = details
        return this
    }

    public setOperational(operational: boolean): AppErrorBuilder {
        this.operational = operational
        return this;
    }

    public build(): AppError {
        const httpCode = this.httpCode
        const code = this.code || httpCode
        const details = this.details.length == 0 ? [{ description: STATUS_CODES[httpCode] || "unknow error" }] : this.details
        const operational = this.operational
        return new AppError(httpCode,code,details,operational)
    }
}

export function newAppErrorBuilder(): AppErrorBuilder {
    return new AppErrorBuilder()
}