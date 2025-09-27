import { NoteRepository, NoteRepositoryFactory } from "@note-app/note-repository";
import { BaseRequest } from "@notes-app/express-common";
import { UserClaim } from "./middleware/UserClaim";
import { APIGatewayProxyEvent } from "aws-lambda";

export interface ApiGatewayEventType {
    event: APIGatewayProxyEvent,
}

export interface NoteApiExpressRequest extends BaseRequest {
    
    noteRepository: NoteRepository;

    userClaim?: UserClaim;

    apiGateway: ApiGatewayEventType;
}

export interface NoteExpressAppConfiguration {

    noteRepositoryFactory: NoteRepositoryFactory;
}