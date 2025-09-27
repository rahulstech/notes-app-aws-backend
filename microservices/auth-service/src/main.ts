
import { ENVIRONMENT, LOGGER } from '@notes-app/common';
import { NoteQueueServiceFactoryImpl } from '@notes-app/queue-service';
import { AuthAppConfig } from './types';
import { createAuthExpressApp } from './app';
import { AuthRepositoryFactoryImpl } from './repository/impl/AuthRepositoryFactoryImpl';
import { AuthServiceFactoryImpl } from './service/impl/AuthServiceFactoryImpl';

const config: AuthAppConfig = {
    authRepositoryFactory: new AuthRepositoryFactoryImpl(
        new AuthServiceFactoryImpl(),
        new NoteQueueServiceFactoryImpl(),
    )
};
const app = createAuthExpressApp(config);

const PORT = ENVIRONMENT.AUTH_SERVICE_SERVER_PORT;

app.listen(PORT, () => {
    LOGGER.logInfo(`server running http://localhost:${PORT}`)
});