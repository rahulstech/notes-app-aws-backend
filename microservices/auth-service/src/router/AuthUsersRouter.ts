import { catchError, extractUserClaim, validateRequest } from "@notes-app/express-common";
import { NextFunction, Response, Router } from "express";
import { APP_ERROR_CODE, newAppErrorBuilder } from "@notes-app/common";
import { VerificationType } from "@notes-app/auth-repository";
import { ChangeEmailRules, ChangeEmailVerifyRules, ResetPasswordRules, ResetPasswordVerifyRules, UpdateUserProfileRules, UserPhotUploadUrlRules } from "./AuthVertificationRules";
import { AuthApiRequest } from "../types";

const usersRouter = Router();

// middlewares

usersRouter.use((req: AuthApiRequest,_,next: NextFunction) => {
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

usersRouter.use(extractUserClaim());

// routes

usersRouter.put('/password', 
    validateRequest(ResetPasswordRules),
    catchError(async (req: AuthApiRequest,res: Response,next: NextFunction) => {
        const { body } = req.validValue;
        await req.authRepository.changePassword({
            oldPassword: body.oldPassword,
            newPassword: body.newPassword,
            accessToken: req.accessToken,
        })
        res.sendStatus(200);
    }));
    
usersRouter.put('/email',
    validateRequest(ChangeEmailRules),
    catchError(async (req: AuthApiRequest, res: Response) => {
        const { body } = req.validValue;
        const codeDeliveryEmail = await req.authRepository.changeEmail({
            accessToken: req.accessToken,
            newEmail: body.newEmail,
        });
        res.json({ codeDeliveryEmail });
    }));

usersRouter.post('/email/verify', 
    validateRequest(ChangeEmailVerifyRules),
    catchError(async (req: AuthApiRequest, res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.verifyCode({
            type: VerificationType.EMAIL,
            code: body.code,
            accessToken: req.accessToken,
        });
        res.sendStatus(200);
    }));

usersRouter.get('/profile-photo-upload-url',
    validateRequest(UserPhotUploadUrlRules),
    catchError(async (req: AuthApiRequest, res: Response) => {
        const { body } = req.validValue;
        const output = await req.authRepository.getProfilePhotoUploadUrl({
            type: body.type,
            size: body.size,
            userId: req.userClaim.userId,
        });
        res.json(output);
    })
)

usersRouter.get('/profile', 
    catchError(async (req: AuthApiRequest, res: Response) => {
        const profile = await req.authRepository.getUserProfile({
            accessToken: req.accessToken,
        });
        res.json({ profile });
    }));

usersRouter.route('/')
    .patch(
        validateRequest(UpdateUserProfileRules),
        catchError(async (req: AuthApiRequest, res: Response) => {
            const { body } = req.validValue;
            const output = await req.authRepository.updateUserProfile({
                accessToken: req.accessToken,
                fullname: body.fullname,
                profile_photo: body.profile_photo,
            });
            res.json(output);
        }))
    .delete(catchError(async (req: AuthApiRequest, res: Response) => {
        await req.authRepository.deleteUser({
            accessToken: req.accessToken,
        });
        res.sendStatus(200);
    }))

usersRouter.delete('/profile-photo', 
    catchError(async (req: AuthApiRequest, res: Response) => {
        await req.authRepository.removeProfilePhoto(req.accessToken);
        res.sendStatus(200);
    })
)

export { usersRouter }