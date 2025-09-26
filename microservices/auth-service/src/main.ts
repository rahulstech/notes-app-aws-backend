
import { ENVIRONMENT } from '@notes-app/common';
import { AuthAppConfig } from './types';
import { AuthRepositoryFactoryImpl } from './repository/impl/AuthRepositoryFactoryImpl';
import { NoteQueueServiceFactoryImpl } from '@notes-app/queue-service';
import { AuthServiceFactoryImpl } from './service/impl/AuthServiceFactoryImpl';
import { createAuthExpressApp } from './app';

const config: AuthAppConfig = {
    authRepositoryFactory: new AuthRepositoryFactoryImpl(
        new AuthServiceFactoryImpl(),
        new NoteQueueServiceFactoryImpl(),
    )
};
const app = createAuthExpressApp(config);

const PORT = ENVIRONMENT.AUTH_SERVICE_SERVER_PORT;

app.listen(PORT, () => {
    console.log(`Auth Service is running on port ${PORT}`);
});