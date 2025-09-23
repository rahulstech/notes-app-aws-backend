import { NoteRepository, NoteRepositoryFactory } from "@note-app/note-repository";
import { ApiGatewayRequest } from "@notes-app/common";

export interface UserClaim {
    userId: string;
}

export interface NoteApiExpressRequest extends ApiGatewayRequest {
    
    noteRepository: NoteRepository;

    validValue?: Record<string,any>;

    userClaim?: UserClaim;
}

export interface NoteExpressAppConfiguration {

    noteRepositoryFactory: NoteRepositoryFactory;
}