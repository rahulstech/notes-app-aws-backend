import { STATUS_CODES } from "node:http";
import AppError, { AppErrorReason } from "./AppError";

export default class ApiError extends AppError {

    constructor(
        public httpCode: number,
        reason: AppErrorReason | null = null,
        code = httpCode
    ) {
        super(code, reason ?? STATUS_CODES[httpCode] ?? "error")
    }
}