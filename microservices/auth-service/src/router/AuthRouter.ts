import { Response, Router } from "express";
import { catchError, validateRequest } from "@notes-app/express-common";
import { ForgotPasswordRules, ForgotPasswordVerifyRules, LogInRules, RefreshRules, RegisterRules, RegisterVerifyCodeRules, RegisterVerifyRules } from "./AuthVertificationRules";
import { VerificationType } from "@notes-app/auth-repository";
import { AuthApiRequest } from "../types";

const authRouter = Router();

// authrization not required

authRouter.post('/register', 
    validateRequest(RegisterRules),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { body } = req.validValue;
        const codeDeliveryEmail = await req.authRepository.registerUser(body);
        res.json({ codeDeliveryEmail });
    }));

authRouter.put('/register/verify', 
    validateRequest(RegisterVerifyRules),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.verifyCode({
            type: VerificationType.REGISTRATION,
            code: body.code,
            email: body.email,
        });
        res.sendStatus(200);
    }));

authRouter.get('/register/verify/code', 
    validateRequest(RegisterVerifyCodeRules,['query']),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { query } = req.validValue;
        const codeDeliveryEmail = await req.authRepository.resendVerificationCode({
            type: VerificationType.REGISTRATION,
            email: query.email,
        });
        res.json({ codeDeliveryEmail });
    }));

authRouter.put('/password', 
    validateRequest(ForgotPasswordRules),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { body } = req.validValue;
        const codeDeliveryEmail = await req.authRepository.forgotPassword({ 
            email: body.email,
        });
        res.json({ codeDeliveryEmail });
    }));

authRouter.post('/password/verify', 
    validateRequest(ForgotPasswordVerifyRules),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { body } = req.validValue;
        await req.authRepository.verifyCode({
            type: VerificationType.FORGET_PASSWORD,
            code: body.code,
            email: body.email,
            newPassword: body.newPassword,
        });
        res.sendStatus(200);
    }));

authRouter.post('/login', 
    validateRequest(LogInRules),
    catchError(async (req: AuthApiRequest,res: Response) => {
        const { body } = req.validValue;
        const output = await req.authRepository.userLogin({
            email: body.email,
            password: body.password,
        });
        res.status(200).json(output); 
    }));

authRouter.post('/refresh',
    validateRequest(RefreshRules),
    catchError(async (req: AuthApiRequest, res: Response) => {
        const { body } = req.validValue;
        const tokens = await req.authRepository.updateTokens({
            refreshToken: body.refreshToken,
        });
        res.json(tokens);
    })
)

export { authRouter }