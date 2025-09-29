import { NoteRepository, NoteRepositoryFactory } from "@note-app/note-repository";
import { AuthenticatedApiGatewayRequest, BaseRequest } from "@notes-app/express-common";
import { UserClaimExtractorProvider } from '@notes-app/express-common'

export interface NoteApiExpressRequest extends BaseRequest, AuthenticatedApiGatewayRequest {
    noteRepository: NoteRepository;
}

export interface NoteExpressAppConfiguration {
    noteRepositoryFactory: NoteRepositoryFactory;
    userClaimExtractorProvider: UserClaimExtractorProvider;
}