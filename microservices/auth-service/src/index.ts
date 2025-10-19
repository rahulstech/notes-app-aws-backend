import { createAuthExpressApp } from "./app";
import { configenv, installUnexpectedErrorHandlers } from "@notes-app/common";
import { NoteObjectServiceFactoryImpl } from "@notes-app/storage-service";
import { NoteQueueServiceFactoryImpl } from "@notes-app/queue-service";
import serverless from "serverless-http";
import { UserClaimExtractorProviderImpl } from "./middleware/UserClaimExtractorProvider";
import { AuthAppConfig } from "./types";
import { AuthRepositoryFactoryImpl } from "@notes-app/auth-repository";
import { AuthServiceFactoryImpl } from "@notes-app/authentication";

installUnexpectedErrorHandlers();

configenv();

// build the app configuration
const config: AuthAppConfig = {
  authRepositoryFactory: new AuthRepositoryFactoryImpl(
    new AuthServiceFactoryImpl(),
    new NoteQueueServiceFactoryImpl(),
    new NoteObjectServiceFactoryImpl()
  ),
  userClaimExtractorProvider: new UserClaimExtractorProviderImpl(),
};

// create express app
const app = createAuthExpressApp(config);

// wrap with serverless-http
export const handler = serverless(app, {});
