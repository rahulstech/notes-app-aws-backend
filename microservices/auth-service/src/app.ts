import { Express, NextFunction } from "express";
import express from "express";
import { authRouter } from "./router/AuthRouter";
import { usersRouter } from "./router/AuthUsersRouter";
import helmet from "helmet";
import cors from "cors";
import { expressErrorHandler, expressNotFoundHandler } from "@notes-app/express-common";
import { AuthApiRequest, AuthAppConfig } from "./types";

export function createAuthExpressApp(config: AuthAppConfig): Express {

    const app: Express = express();

    // install middlewares

    app.use(helmet());

    app.use(cors());

    app.use(express.json());

    app.use((req: AuthApiRequest,_,next: NextFunction) => {
        req.authRepository = config.authRepositoryFactory.createAuthRepository();
        req.userClaimExtractor = config.userClaimExtractorProvider.getApiGatewayUserClaimExtractor();
        next();
    })

    // set routers

    app.use('/auth', authRouter);

    app.use('/auth/users', usersRouter);

    // error handlers 

    app.use(expressNotFoundHandler());

    app.use(expressErrorHandler());

    return app;
}