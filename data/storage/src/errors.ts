import { AppError, newAppErrorBuilder } from "@notes-app/common";



export function convertS3Errors(error: any, context: string): AppError {
    const builder = newAppErrorBuilder()

    switch(error.name) {
        case 'CredentialsProviderError':
        case 'ExpiredToken': {
            builder.setHttpCode(401).addDetails({ description: error.message, context }).setOperational(false)
        }
        break;
        case 'AccessDenied': {
            builder.setHttpCode(403).addDetails(error.message).setOperational(false)
        }
        break
        case 'NoSuchBucket': {
            builder.setHttpCode(404).addDetails(error.message).setOperational(false)
        }
    }
    return new AppError(0)
}