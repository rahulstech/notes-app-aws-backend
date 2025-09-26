import { STATUS_CODES } from "node:http";

export const APP_ERROR_CODE = {
    NOT_FOUND: 6001,
    INTERNAL_SERVER_ERROR: 6002,
    NOT_IMPLEMENTED: 6003,
    BAD_REQUEST: 6004,
    UNAUTHORIZED: 6005,
    FORBIDDEN: 6006,
    CONFLICT: 6007,
    PRECONDITION_FAILED: 6008,
    TOO_MANY_REQUESTS: 6009,
    SERVICE_UNAVAILABLE: 6010,
    LIMIT_EXCEEDED: 6011,
    INCORRECT_INPUT: 6012,
};

export interface AppErrorItem {
    description: string;
    context?: string;
    reason?: any;
}

export class AppError extends Error {
    
    constructor(
        public httpCode: number,
        public code: number = httpCode,
        public details: AppErrorItem[] = [],
        public retriable: boolean = false,
        public operational: boolean = true,
    ) {
        super();
        this.name = this.constructor.name;
    }

    public appendDetails(item: AppErrorItem | AppErrorItem[]) {
        if (Array.isArray(item)) {
            this.details = this.details.concat(item);
        }
        else {
            this.details.push(item);
        }
    }

    public toJSON(): object {
        return {
            name: this.name,
            httpCode: this.httpCode,
            code: this.code,
            retriable: this.retriable,
            operational: this.operational,
            details: this.details,
        };
    }
}

export class AppErrorBuilder {

    private details: AppErrorItem[] = [];
    private httpCode: number = 500;
    private code?: number;
    private retriable: boolean = false;
    private operational: boolean = true;

    constructor(){}

    public copy(src: AppError): AppErrorBuilder {
        this.httpCode = src.httpCode;
        this.code = src.code;
        this.details = src.details;
        this.operational = src.operational;
        return this;
    }

    public setCode(code: number): AppErrorBuilder {
        this.code = code;
        return this;
    }

    public setHttpCode(httpCode: number): AppErrorBuilder {
        this.httpCode = httpCode;
        return this;
    }

    public addDetails(details: string | Error | AppErrorItem): AppErrorBuilder {
        if (typeof details === 'string' || details instanceof Error) {
            this.details.push(createAppErrorItem(details));
        }
        else {
            this.details.push(details);
        }
        return this;
    }

    public setDetails(details: AppErrorItem[]): AppErrorBuilder {
        this.details = details;
        return this;
    }

    public setOperational(operational: boolean): AppErrorBuilder {
        this.operational = operational
        return this;
    }

    public setRetriable(retriable: boolean): AppErrorBuilder {
        this.retriable = retriable;
        return this;
    }

    public build(): AppError {
        const httpCode = this.httpCode;
        const code = this.code || httpCode;
        const details = this.details.length == 0 ? [{ description: STATUS_CODES[httpCode] || "unknow error" }] : this.details;
        const operational = this.operational;
        const retriable = operational && this.retriable;
        return new AppError(httpCode,code,details,retriable, operational);
    }
}

export function newAppErrorBuilder(): AppErrorBuilder {
    return new AppErrorBuilder();
}

export function createAppErrorItem(error: Error | string, context?: string, reason?: any): AppErrorItem {
    if (error instanceof Error) {
        return { description: error.message, context, reason: reason || error };
    }
    return { description: error, context, reason };
}