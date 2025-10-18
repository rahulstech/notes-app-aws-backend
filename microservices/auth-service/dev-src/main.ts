
import { configenv, installUnexpectedErrorHandlers, LOGGER } from '@notes-app/common';
import { NoteQueueServiceFactoryImpl } from '@notes-app/queue-service';
import { AuthAppConfig } from '../src/types';
import { createAuthExpressApp } from '../src/app';
import { AuthRepositoryFactoryImpl } from '@notes-app/auth-repository';
import { AuthServiceFactoryImpl } from '@notes-app/authentication';
import { NoteObjectServiceFactoryImpl } from '@notes-app/storage-service';
import { UserClaimExtractorProviderImpl } from './middleware/UserClaimExtractorProvider';

installUnexpectedErrorHandlers();

const { AUTH_SERVICE_SERVER_PORT } = configenv();

const config: AuthAppConfig = {
    authRepositoryFactory: new AuthRepositoryFactoryImpl(
        new AuthServiceFactoryImpl(),
        new NoteQueueServiceFactoryImpl(),
        new NoteObjectServiceFactoryImpl()
    ),
    userClaimExtractorProvider: new UserClaimExtractorProviderImpl(),
};
const app = createAuthExpressApp(config);

const PORT = AUTH_SERVICE_SERVER_PORT;
app.listen(PORT, () => {
    LOGGER.logInfo(`auth server running http://localhost:${PORT}`)
});