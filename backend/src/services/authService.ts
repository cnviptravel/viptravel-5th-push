import { Env } from '../types/env';
import { AppError } from '../errors';
import { DatabaseService } from './database';
import { formatUserResponse } from '../utils/response';
import { validateEmail, validatePassword } from '../utils/validation';
import { sendEmail, getVerificationEmailHtml } from './email';

/**
 * Authentication service
 */
export class AuthService {
    constructor(
        private env: Env,
        private db: DatabaseService
    ) {}

    /**
     * Authenticate user with email and password
     */
    async login(email: string, password: string): Promise<any> {
        if (!email || !password) {
            throw AppError.badRequest('Email and password required');
        }

        if (!validateEmail(email)) {
            throw AppError.badRequest('Invalid email format');
        }

        const user = await this.db.getUserByEmail(email);
        
        if (!user) {
            throw AppError.unauthorized('Invalid credentials');
        }

        // Check password (in real app, use hashed passwords)
        if (user.password !== password) {
            throw AppError.unauthorized('Invalid credentials');
        }

        // Flexible verification logic
        const role = user.role || 'traveler';
        const emailV = !!user.isEmailVerified;
        const phoneV = !!user.isPhoneVerified;
        const eitherVerified = emailV || phoneV;
        
        // Admin email check
        const isAdminEmail = user.email === 'auth@cnviptravel.com';
        if (isAdminEmail && !user.isAdmin) {
            await this.db.execute(
                "UPDATE users SET isAdmin = 1 WHERE id = ?",
                user.id
            );
        }

        let isVerified = !!user.isVerified;
        let status = user.status || 'pending';

        if (role === 'traveler') {
            // Traveler: auto-verify & approve if email OR phone verified
            if (eitherVerified && !isVerified) {
                isVerified = true;
                status = 'approved';
                await this.db.execute(
                    "UPDATE users SET isVerified = 1, status = 'approved' WHERE id = ?",
                    user.id
                );
            }
        } else if (role === 'guide' || role === 'provider') {
            // Provider/Guide: isVerified ONLY when admin manually approves
            if (status === 'approved') {
                isVerified = true;
                if (!user.isVerified) {
                    await this.db.execute(
                        "UPDATE users SET isVerified = 1 WHERE id = ?",
                        user.id
                    );
                }
            } else {
                isVerified = false;
            }
        }

        return formatUserResponse({ 
            ...user, 
            isVerified, 
            status, 
            isAdmin: isAdminEmail ? true : !!user.isAdmin 
        });
    }

    /**
     * Register new user
     */
    async register(userData: any): Promise<any> {
        const { email, password } = userData;
        
        if (!email || !password) {
            throw AppError.badRequest('Email and password required');
        }

        if (!validateEmail(email)) {
            throw AppError.badRequest('Invalid email format');
        }

        validatePassword(password);

        // Check if email exists
        const exists = await this.db.exists('users', 'email', email);
        if (exists) {
            throw AppError.conflict('Email already exists');
        }

        const role = userData.role || 'traveler';
        const isEmailVerified = userData.isEmailVerified ? 1 : 0;
        const isPhoneVerified = userData.isPhoneVerified ? 1 : 0;
        
        let isVerified = 0;
        let status = 'pending';
        
        if (role === 'traveler') {
            isVerified = (isEmailVerified || isPhoneVerified) ? 1 : 0;
            status = isVerified ? 'approved' : 'pending';
        }
        
        const isAdmin = email === 'auth@cnviptravel.com' ? 1 : 0;
        
        const userToCreate = {
            full_name: userData.full_name || null,
            first_name: userData.first_name || null,
            last_name: userData.last_name || null,
            birth_date: userData.birth_date || null,
            referral_source: userData.referral_source || null,
            email,
            phone: userData.phone || null,
            password,
            role,
            status,
            created_at: Date.now(),
            isEmailVerified,
            isPhoneVerified,
            isVerified,
            isAdmin
        };

        const userId = await this.db.createUser(userToCreate);
        
        const user = await this.db.getUserById(userId);
        return formatUserResponse(user);
    }

    /**
     * Send OTP for email verification
     */
    async sendEmailOtp(email: string): Promise<void> {
        if (!validateEmail(email)) {
            throw AppError.badRequest('Invalid email format');
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await this.db.execute(
            `INSERT INTO email_verifications (email, code, createdAt) 
             VALUES (?, ?, ?) 
             ON CONFLICT(email) DO UPDATE SET code=excluded.code, createdAt=excluded.createdAt`,
            email, code, Date.now()
        );

        // Send email via Brevo SMTP
        try {
            const htmlContent = getVerificationEmailHtml(code);
            await sendEmail(
                email,
                "VipTravel - Verification Code",
                `Your verification code is: ${code}. This code expires in 10 minutes.`,
                htmlContent,
                this.env.BREVO_API_KEY,
                this.env
            );
            console.log(`[AuthService] Email OTP sent to ${email}`);
        } catch (error: any) {
            console.error(`[AuthService] Failed to send email to ${email}:`, error);
            throw AppError.internal(`Failed to send verification email: ${error.message}`);
        }
    }

    /**
     * Verify email OTP
     */
    async verifyEmailOtp(email: string, code: string): Promise<boolean> {
        const record = await this.db.queryFirst(
            "SELECT * FROM email_verifications WHERE email = ?",
            email
        );
        
        if (record && record.code === code) {
            // Mark email as verified in user table
            await this.db.execute(
                "UPDATE users SET isEmailVerified = 1 WHERE email = ?",
                email
            );
            return true;
        }
        
        return false;
    }

    /**
     * Send Telegram OTP
     */
    async sendTelegramOtp(phone: string): Promise<{ sessionCode: string; botUsername: string }> {
        const sessionCode = Math.random().toString(36).substr(2, 8).toUpperCase();
        
        await this.db.execute(
            "INSERT INTO telegram_verifications (code, phone, verified, createdAt) VALUES (?, ?, 0, ?)",
            sessionCode, phone, Date.now()
        );
        
        return { sessionCode, botUsername: "viptravel_verification_bot" };
    }

    /**
     * Verify Telegram OTP
     */
    async verifyTelegramOtp(phone: string, code: string): Promise<boolean> {
        const record = await this.db.queryFirst(
            "SELECT * FROM telegram_verifications WHERE phone = ? ORDER BY createdAt DESC",
            phone
        );
        
        if (record && record.otpCode === code) {
            await this.db.execute(
                "UPDATE telegram_verifications SET verified = 1 WHERE code = ?",
                record.code
            );
            
            // Mark phone as verified in user table
            await this.db.execute(
                "UPDATE users SET isPhoneVerified = 1 WHERE phone = ?",
                phone
            );
            
            return true;
        }
        
        return false;
    }

    /**
     * Handle Telegram webhook
     */
    async handleTelegramWebhook(update: any): Promise<void> {
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Handle /start SESSION_CODE
            if (text && text.startsWith("/start ")) {
                const sessionCode = text.split(" ")[1];
                const record = await this.db.queryFirst(
                    "SELECT * FROM telegram_verifications WHERE code = ?",
                    sessionCode
                );
                
                if (record) {
                    await this.db.execute(
                        "UPDATE telegram_verifications SET chatId = ? WHERE code = ?",
                        String(chatId), sessionCode
                    );
                    
                    // Send welcome message with contact request button
                    // (Telegram API call would go here)
                }
            }
            
            // Handle Contact Sharing
            if (update.message.contact) {
                const contact = update.message.contact;
                const record = await this.db.queryFirst(
                    "SELECT * FROM telegram_verifications WHERE chatId = ? ORDER BY createdAt DESC",
                    String(chatId)
                );
                
                if (record) {
                    const expected = record.phone.replace(/[^0-9]/g, '');
                    const actual = contact.phone_number.replace(/[^0-9]/g, '');
                    
                    if (actual.includes(expected) || expected.includes(actual)) {
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        await this.db.execute(
                            "UPDATE telegram_verifications SET otpCode = ? WHERE code = ?",
                            otp, record.code
                        );
                        
                        // Send OTP via Telegram
                        // (Telegram API call would go here)
                    }
                }
            }
        }
    }
}

/**
 * Create auth service instance
 */
export function createAuthService(env: Env): AuthService {
    const db = new DatabaseService(env);
    return new AuthService(env, db);
}
