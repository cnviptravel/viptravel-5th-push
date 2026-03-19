// Authentication Routes - Login, Register, OTP Verification

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { sendEmail, getVerificationEmailHtml } from '../services/email';

/**
 * Handle login request
 */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
    try {
        let body: any;
        try {
            const text = await request.text();
            console.log("Request text:", text);
            body = JSON.parse(text);
        } catch (parseError: any) {
            console.error("JSON parse error:", parseError);
            return new Response(JSON.stringify({ 
                error: "Invalid JSON format", 
                details: parseError?.message || "Parse error" 
            }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        
        const { email, password } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Get user by email
        const user = await env.DB.prepare(
            "SELECT * FROM users WHERE email = ?"
        ).bind(email).first() as any;

        if (!user) {
            return new Response(JSON.stringify({ error: "Invalid credentials" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check password (in real app, use hashed passwords)
        if (user.password !== password) {
            return new Response(JSON.stringify({ error: "Invalid credentials" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Flexible verification logic
        const role = user.role || 'traveler';
        const emailV = !!user.isEmailVerified;
        const phoneV = !!user.isPhoneVerified;
        const eitherVerified = emailV || phoneV;
        
        // Admin email check
        const isAdminEmail = user.email === 'auth@cnviptravel.com';
        if (isAdminEmail && !user.isAdmin) {
            await env.DB.prepare(
                "UPDATE users SET isAdmin = 1 WHERE id = ?"
            ).bind(user.id).run();
        }

        let isVerified = !!user.isVerified;
        let status = user.status || 'pending';

        if (role === 'traveler') {
            // Traveler: auto-verify & approve if email OR phone verified
            if (eitherVerified && !isVerified) {
                isVerified = true;
                status = 'approved';
                await env.DB.prepare(
                    "UPDATE users SET isVerified = 1, status = 'approved' WHERE id = ?"
                ).bind(user.id).run();
            }
        } else if (role === 'guide' || role === 'provider') {
            // Provider/Guide: isVerified ONLY when admin manually approves
            if (status === 'approved') {
                isVerified = true;
                if (!user.isVerified) {
                    await env.DB.prepare(
                        "UPDATE users SET isVerified = 1 WHERE id = ?"
                    ).bind(user.id).run();
                }
            } else {
                isVerified = false;
            }
        }

        // Format user response
        const response = {
            _id: String(user.id),
            name: user.full_name || "Guest",
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            birthDate: user.birth_date || "",
            referralSource: user.referral_source || "",
            email: user.email,
            role: role,
            phone: user.phone || "",
            isPhoneVerified: phoneV,
            isEmailVerified: emailV,
            isVerified: isVerified,
            isAdmin: isAdminEmail ? true : !!user.isAdmin,
            nationality: user.nationality || "Mongolia",
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: JSON.parse((user.blockedUsers as string) || "[]"),
            savedPostIds: JSON.parse((user.savedPostIds as string) || "[]"),
            travelPhotos: typeof user.travelPhotos === "string" ? JSON.parse((user.travelPhotos as string) || "[]") : (user.travelPhotos || []),
            visitedPlaces: typeof user.visitedPlaces === "string" ? JSON.parse((user.visitedPlaces as string) || "[]") : (user.visitedPlaces || []),
            languages: typeof user.languages === "string" ? JSON.parse((user.languages as string) || "[]") : (user.languages || []),
            examResults: typeof user.examResults === "string" ? JSON.parse((user.examResults as string) || "[]") : (user.examResults || []),
            status: status,
            profilePic: user.profilePic || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
            createdAt: user.created_at ? new Date(user.created_at as number).toISOString() : new Date().toISOString(),
            isOnline: true
        };

        return new Response(JSON.stringify(response), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Login error:", e);
        return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}

/**
 * Handle registration request
 */
export async function handleRegister(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { email, password } = body;

        if (!email || !password) {
            return new Response(JSON.stringify({ error: "Email and password required" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check if email exists
        const exists = await env.DB.prepare(
            "SELECT 1 FROM users WHERE email = ?"
        ).bind(email).first();

        if (exists) {
            return new Response(JSON.stringify({ error: "Email already exists" }), {
                status: 409,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const role = body.role || 'traveler';
        const isEmailVerified = body.isEmailVerified ? 1 : 0;
        const isPhoneVerified = body.isPhoneVerified ? 1 : 0;
        
        let isVerified = 0;
        let status = 'pending';
        
        if (role === 'traveler') {
            isVerified = (isEmailVerified || isPhoneVerified) ? 1 : 0;
            status = isVerified ? 'approved' : 'pending';
        }
        
        const isAdmin = email === 'auth@cnviptravel.com' ? 1 : 0;
        
        const result = await env.DB.prepare(
            `INSERT INTO users (
                full_name, first_name, last_name, birth_date, referral_source,
                email, phone, password, role, status, created_at,
                isEmailVerified, isPhoneVerified, isVerified, isAdmin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            body.full_name || null,
            body.first_name || null,
            body.last_name || null,
            body.birth_date || null,
            body.referral_source || null,
            email,
            body.phone || null,
            password,
            role,
            status,
            Date.now(),
            isEmailVerified,
            isPhoneVerified,
            isVerified,
            isAdmin
        ).run();

        const userId = result.meta.last_row_id;
        const user = await env.DB.prepare(
            "SELECT * FROM users WHERE id = ?"
        ).bind(userId).first() as any;

        if (!user) {
            throw new Error("Failed to retrieve created user");
        }

        // Format user response
        const response = {
            _id: String(user.id),
            name: user.full_name || "Guest",
            firstName: user.first_name || "",
            lastName: user.last_name || "",
            birthDate: user.birth_date || "",
            referralSource: user.referral_source || "",
            email: user.email,
            role: user.role || 'traveler',
            phone: user.phone || "",
            isPhoneVerified: !!user.isPhoneVerified,
            isEmailVerified: !!user.isEmailVerified,
            isVerified: !!user.isVerified,
            isAdmin: !!user.isAdmin,
            nationality: user.nationality || "Mongolia",
            privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
            blockedUsers: JSON.parse((user.blockedUsers as string) || "[]"),
            savedPostIds: JSON.parse((user.savedPostIds as string) || "[]"),
            travelPhotos: typeof user.travelPhotos === "string" ? JSON.parse((user.travelPhotos as string) || "[]") : (user.travelPhotos || []),
            visitedPlaces: typeof user.visitedPlaces === "string" ? JSON.parse((user.visitedPlaces as string) || "[]") : (user.visitedPlaces || []),
            languages: typeof user.languages === "string" ? JSON.parse((user.languages as string) || "[]") : (user.languages || []),
            examResults: typeof user.examResults === "string" ? JSON.parse((user.examResults as string) || "[]") : (user.examResults || []),
            status: user.status || 'pending',
            profilePic: user.profilePic || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
            createdAt: user.created_at ? new Date(user.created_at as number).toISOString() : new Date().toISOString(),
            isOnline: true
        };

        return new Response(JSON.stringify(response), {
            status: 201,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("Register error:", e);
        return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}

/**
 * Handle OTP send request
 */
export async function handleOtpSend(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { type, identifier } = body;

        if (type === 'email') {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Save code to database
            await env.DB.prepare(
                `INSERT INTO email_verifications (email, code, createdAt) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(email) DO UPDATE SET code=excluded.code, createdAt=excluded.createdAt`
            ).bind(identifier, code, Date.now()).run();

            // Send email via Brevo SMTP
            try {
                const htmlContent = getVerificationEmailHtml(code);
                await sendEmail(
                    identifier,
                    "VipTravel - Verification Code",
                    `Your verification code is: ${code}. This code expires in 10 minutes.`,
                    htmlContent,
                    env.BREVO_API_KEY
                );
                console.log(`[OTP] Email sent to ${identifier} with code ${code}`);
            } catch (emailError: any) {
                console.error("[OTP] Failed to send email:", emailError);
                return new Response(JSON.stringify({ 
                    error: "Failed to send verification email", 
                    details: emailError.message 
                }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
            }

            return new Response(JSON.stringify({ 
                success: true, 
                message: "OTP sent to your email" 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } else if (type === 'telegram') {
            const sessionCode = Math.random().toString(36).substr(2, 8).toUpperCase();
            
            await env.DB.prepare(
                "INSERT INTO telegram_verifications (code, phone, verified, createdAt) VALUES (?, ?, 0, ?)"
            ).bind(sessionCode, identifier, Date.now()).run();
            
            return new Response(JSON.stringify({ 
                sessionCode, 
                botUsername: "viptravel_verification_bot" 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } else {
            return new Response(JSON.stringify({ error: "Invalid OTP type" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

    } catch (e: any) {
        console.error("OTP send error:", e);
        return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}

/**
 * Handle OTP verify request
 */
export async function handleOtpVerify(request: Request, env: Env): Promise<Response> {
    try {
        const body = await request.json() as any;
        const { type, identifier, code } = body;

        let verified = false;

        if (type === 'email') {
            const record = await env.DB.prepare(
                "SELECT * FROM email_verifications WHERE email = ?"
            ).bind(identifier).first();
            
            if (record && record.code === code) {
                // Mark email as verified in user table
                await env.DB.prepare(
                    "UPDATE users SET isEmailVerified = 1 WHERE email = ?"
                ).bind(identifier).run();
                verified = true;
            }
        } else if (type === 'telegram') {
            const record = await env.DB.prepare(
                "SELECT * FROM telegram_verifications WHERE phone = ? ORDER BY createdAt DESC"
            ).bind(identifier).first();
            
            if (record && record.otpCode === code) {
                await env.DB.prepare(
                    "UPDATE telegram_verifications SET verified = 1 WHERE code = ?"
                ).bind(record.code).run();
                
                // Mark phone as verified in user table
                await env.DB.prepare(
                    "UPDATE users SET isPhoneVerified = 1 WHERE phone = ?"
                ).bind(identifier).run();
                
                verified = true;
            }
        } else {
            return new Response(JSON.stringify({ error: "Invalid OTP type" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (verified) {
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        } else {
            return new Response(JSON.stringify({ error: "Invalid verification code" }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

    } catch (e: any) {
        console.error("OTP verify error:", e);
        return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
}

/**
 * Handle Telegram webhook
 */
export async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
    try {
        const update = await request.json() as any;
        
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Handle /start SESSION_CODE
            if (text && text.startsWith("/start ")) {
                const sessionCode = text.split(" ")[1];
                const record = await env.DB.prepare(
                    "SELECT * FROM telegram_verifications WHERE code = ?"
                ).bind(sessionCode).first();
                
                if (record) {
                    await env.DB.prepare(
                        "UPDATE telegram_verifications SET chatId = ? WHERE code = ?"
                    ).bind(String(chatId), sessionCode).run();
                    
                    // Send welcome message with contact request button
                    // (Telegram API call would go here)
                }
            }
            
            // Handle Contact Sharing
            if (update.message.contact) {
                const contact = update.message.contact;
                const record = await env.DB.prepare(
                    "SELECT * FROM telegram_verifications WHERE chatId = ? ORDER BY createdAt DESC"
                ).bind(String(chatId)).first();
                
                if (record) {
                    const expected = (record.phone as string).replace(/[^0-9]/g, '');
                    const actual = contact.phone_number.replace(/[^0-9]/g, '');
                    
                    if (actual.includes(expected) || expected.includes(actual)) {
                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                        await env.DB.prepare(
                            "UPDATE telegram_verifications SET otpCode = ? WHERE code = ?"
                        ).bind(otp, record.code).run();
                        
                        // Send OTP via Telegram
                        // (Telegram API call would go here)
                    }
                }
            }
        }

        return new Response('OK');

    } catch (error) {
        console.error('Telegram webhook error:', error);
        return new Response('OK'); // Always return OK to Telegram
    }
}
