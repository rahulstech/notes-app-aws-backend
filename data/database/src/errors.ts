import { AppError } from "@notes-app/common";

export function convertDynamoDbError(error: any): AppError {
    return new AppError(0)
}