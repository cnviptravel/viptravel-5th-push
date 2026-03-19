import { Env } from '../types/env';
import { AppError, errorHandler } from '../errors';
import { successResponse, errorResponse } from '../utils/response';
import { createAuthService } from '../services/authService';
import { validateRequest, AuthSchemas } from '../middleware/validation';

/**
 * Authentication controller
 */
export class AuthController {
    private authService;

    constructor(env: Env) {
        this.authService = createAuthService(env);
    }

    /**
     * Handle login request
     */
    async login(request: Request): Promise<Response> {
        try {
            // Parse request body
            let body: any;
            try {
                body = await request.json();
            } catch (error) {
                console.error('JSON parse error:', error);
                return errorResponse('Invalid request body', 400);
            }
            
            const { email, password } = body;
            
            if (!email || !password) {
                return errorResponse('Email and password required', 400);
            }
            
            const user = await this.authService.login(email, password);
            
            return successResponse(user);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Handle registration request
     */
    async register(request: Request): Promise<Response> {
        try {
            // Validate request
            const validate = validateRequest(AuthSchemas.register);
            const body = await validate(request);
            
            const user = await this.authService.register(body);
            
            return successResponse(user, 201);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Handle OTP send request
     */
    async sendOtp(request: Request): Promise<Response> {
        try {
            // Validate request
            const validate = validateRequest(AuthSchemas.otpSend);
            const body = await validate(request);
            
            const { type, identifier } = body;
            
            if (type === 'email') {
                await this.authService.sendEmailOtp(identifier);
                return successResponse({ 
                    success: true, 
                    message: "OTP sent to your email" 
                });
            } else if (type === 'telegram') {
                const result = await this.authService.sendTelegramOtp(identifier);
                return successResponse(result);
            } else {
                throw AppError.badRequest('Invalid OTP type');
            }
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Handle OTP verify request
     */
    async verifyOtp(request: Request): Promise<Response> {
        try {
            // Validate request
            const validate = validateRequest(AuthSchemas.otpVerify);
            const body = await validate(request);
            
            const { type, identifier, code } = body;
            
            let verified = false;
            
            if (type === 'email') {
                verified = await this.authService.verifyEmailOtp(identifier, code);
            } else if (type === 'telegram') {
                verified = await this.authService.verifyTelegramOtp(identifier, code);
            } else {
                throw AppError.badRequest('Invalid OTP type');
            }
            
            if (verified) {
                return successResponse({ success: true });
            } else {
                throw AppError.badRequest('Invalid verification code');
            }
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Handle Telegram webhook
     */
    async telegramWebhook(request: Request): Promise<Response> {
        try {
            const update = await request.json();
            await this.authService.handleTelegramWebhook(update);
            return new Response('OK');
        } catch (error) {
            console.error('Telegram webhook error:', error);
            return new Response('OK'); // Always return OK to Telegram
        }
    }
}

/**
 * Create auth controller instance
 */
export function createAuthController(env: Env): AuthController {
    return new AuthController(env);
}