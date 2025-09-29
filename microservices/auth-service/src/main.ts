
import { ENVIRONMENT, LOGGER } from '@notes-app/common';
import { NoteQueueServiceFactoryImpl } from '@notes-app/queue-service';
import { AuthAppConfig } from './types';
import { createAuthExpressApp } from './app';
import { AuthRepositoryFactoryImpl } from '@notes-app/auth-repository';
import { AuthServiceFactoryImpl } from '@notes-app/authentication';
import { NoteObjectServiceFactoryImpl } from '@notes-app/storage-service';
import { UserClaimExtractorProviderImpl } from './middleware/UserClaimExtractorProvider';

const config: AuthAppConfig = {
    authRepositoryFactory: new AuthRepositoryFactoryImpl(
        new AuthServiceFactoryImpl(),
        new NoteQueueServiceFactoryImpl(),
        new NoteObjectServiceFactoryImpl()
    ),
    userClaimExtractorProvider: new UserClaimExtractorProviderImpl(),
};
const app = createAuthExpressApp(config);

const PORT = ENVIRONMENT.AUTH_SERVICE_SERVER_PORT;

app.listen(PORT, () => {
    LOGGER.logInfo(`server running http://localhost:${PORT}`)
});