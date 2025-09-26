import { catchError, validateRequest } from "@notes-app/express-common";
import { NextFunction, Response, Router } from "express";
import { AuthApiAuthenticatedRequest } from "../types";
import { APP_ERROR_CODE, newAppErrorBuilder } from "@notes-app/common";
import { ChangePasswordType, VerificationType } from "../repository/types";
import { ChangeEmailRules, ChangeEmailVerifyRules, ResetPasswordRules, ResetPasswordVerifyRules, UpdateUserProfileRules } from "./AuthVertificationRules";

const usersRouter = Router();

usersRouter.use((req: AuthApiAuthenticatedRequest,_,next: NextFunction) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== "string") {
        const prefix = (authHeader as string).slice(0,6).toLowerCase();
        if (prefix !== 'bearer') {
            next(newAppErrorBuilder()
                .setHttpCode(401)
                .setCode(APP_ERROR_CODE.UNAUTHORIZED)
                .addDetails('no authrization bearer header found')
                .build());
            return;
        }
    }
  
    const token = (authHeader as string).slice(7); // remove "Bearer "
    req.accessToken = token;
    next();
});

usersRouter.put('/password', 
    validateRequest(ResetPasswordRules),
    catchError(async (req: AuthApiAuthenticatedRequest,res: Response,next: NextFunction) => {
        const { body } = req.validValue;
        await req.authRepository.changePassword({
            type: ChangePasswordType.RESET_PASSWORD,
            oldPassword: body.oldPassword,
            newPassword: body.newPassword,
            accessToken: req.accessToken,
        })
        res.sendStatus(200);
    }));

usersRouter.post('/password/verify', 
    validateRequest(ResetPasswordVerifyRules),
    catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.verifyCode({
            type: VerificationType.RESET_PASSWORD,
            code: body.code,
            accessToken: req.accessToken,
        })
    }));
    

usersRouter.put('/email',
    validateRequest(ChangeEmailRules),
    catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
        const { body } = req.validValue;
        const codeDeliveryEmail = await req.authRepository.changeEmail({
            accessToken: req.accessToken,
            newEmail: body.newEmail,
        });
        res.json({ codeDeliveryEmail });
    }));

usersRouter.post('/email/verify', 
    validateRequest(ChangeEmailVerifyRules),
    catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.verifyCode({
            type: VerificationType.EMAIL,
            code: body.code,
            accessToken: req.accessToken,
        });
        res.sendStatus(200);
    }));

usersRouter.route('/')
.get(catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
    const profile = await req.authRepository.getUserProfile(req.accessToken);
    res.json({ profile });
}))
.patch(
    validateRequest(UpdateUserProfileRules),
    catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.updateUserProfile({
            accessToken: req.accessToken,
            fullname: body.fullname,
            user_photo: body.user_photo,
        });
        res.sendStatus(200);
    }))
.delete(catchError(async (req: AuthApiAuthenticatedRequest, res: Response) => {
    await req.authRepository.deleteUser(req.accessToken);
    res.sendStatus(200);
}))

export { usersRouter }