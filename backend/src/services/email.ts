// Brevo (SendinBlue) Email Service

/**
 * Send email via Brevo API
 */
export async function sendEmail(
    to: string, 
    subject: string, 
    text: string, 
    html?: string, 
    apiKey?: string,
    env?: any
): Promise<boolean> {
    const fromEmail = "auth@cnviptravel.com";
    
    if (!apiKey) {
        throw new Error("BREVO_API_KEY is not configured. Cannot send email.");
    }

    const payload: any = {
        sender: {
            name: "VipTravel Authentication",
            email: fromEmail
        },
        to: [
            { email: to, name: "User" }
        ],
        subject: subject,
        textContent: text,
        // Add headers to improve deliverability
        headers: {
            "X-Mailer": "VipTravel-Auth-System/1.0",
            "X-Priority": "1",
            "X-MSMail-Priority": "High",
            "Importance": "High"
        },
        // Add tags for better tracking
        tags: ["verification", "authentication", "security"]
    };

    if (html) {
        payload.htmlContent = html;
    }

    console.log(`[Brevo] Sending email to ${to} from ${fromEmail}...`);

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "accept": "application/json",
                "api-key": apiKey,
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Brevo] Error ${response.status}:`, errorText);
            throw new Error(`Brevo Email Error (${response.status}): ${errorText}`);
        }
        
        console.log("[Brevo] Email sent successfully.");
        
        if (env) {
            try {
                const { logApiUsage } = await import('../utils/apiUsageLogger');
                await logApiUsage(env, 'brevo_email', 'send_email', null, 1);
            } catch (_) {}
        }
        
        return true;
    } catch (e: any) {
        console.error("[Brevo] Fetch failed:", e);
        throw e;
    }
}

/**
 * Generate verification email HTML template
 */
export function getVerificationEmailHtml(code: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VipTravel - Email Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        .header p {
            margin: 10px 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .code-container {
            background: linear-gradient(135deg, #f6f8ff 0%, #f0f4ff 100%);
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
            border: 1px solid #e2e8f0;
        }
        .verification-code {
            font-size: 42px;
            font-weight: 700;
            color: #2563eb;
            letter-spacing: 8px;
            margin: 0;
            font-family: 'Courier New', monospace;
        }
        .instructions {
            background-color: #f8fafc;
            border-left: 4px solid #3b82f6;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }
        .instructions h3 {
            color: #1e40af;
            margin-top: 0;
        }
        .footer {
            background-color: #f1f5f9;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .company-info {
            color: #64748b;
            font-size: 14px;
            line-height: 1.5;
            margin-top: 20px;
        }
        .company-info a {
            color: #3b82f6;
            text-decoration: none;
        }
        .company-info a:hover {
            text-decoration: underline;
        }
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }
        @media (max-width: 600px) {
            .content {
                padding: 25px 20px;
            }
            .verification-code {
                font-size: 32px;
                letter-spacing: 6px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 VipTravel Verification</h1>
            <p>Secure your account with email verification</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1e293b; margin-top: 0;">Hello,</h2>
            <p>Thank you for choosing VipTravel! To complete your registration and secure your account, please verify your email address using the verification code below:</p>
            
            <div class="code-container">
                <p style="color: #475569; margin-bottom: 15px; font-size: 16px;">Your verification code:</p>
                <h2 class="verification-code">${code}</h2>
                <p style="color: #64748b; margin-top: 15px; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            
            <div class="instructions">
                <h3>📋 How to use this code:</h3>
                <ol style="margin: 15px 0; padding-left: 20px;">
                    <li>Return to the VipTravel website or app</li>
                    <li>Enter the verification code shown above</li>
                    <li>Click "Verify Email" to complete the process</li>
                    <li>Start exploring travel experiences immediately!</li>
                </ol>
            </div>
            
            <div class="security-note">
                <strong>🔒 Security Notice:</strong> For your protection, never share this code with anyone. VipTravel will never ask for your password or verification code via email.
            </div>
            
            <p style="color: #475569;">If you didn't request this verification code, you can safely ignore this email. Your account remains secure.</p>
            
            <p style="color: #475569;">Need help? <a href="mailto:support@cnviptravel.com" style="color: #3b82f6;">Contact our support team</a> for assistance.</p>
        </div>
        
        <div class="footer">
            <p style="margin: 0; color: #475569; font-weight: 600;">Safe travels with VipTravel ✈️</p>
            
            <div class="company-info">
                <p style="margin: 15px 0 5px;">
                    <strong>VipTravel LLC</strong><br>
                    Ulaanbaatar, Mongolia<br>
                    Email: <a href="mailto:info@cnviptravel.com">info@cnviptravel.com</a><br>
                    Phone: +976 7010 0000
                </p>
                <p style="margin: 5px 0; font-size: 12px;">
                    <strong>Official Authentication Email</strong><br>
                    Sent from: <strong>auth@cnviptravel.com</strong> - VipTravel Secure Authentication System<br>
                    This is an official email for account verification purposes.
                </p>
                <p style="margin: 15px 0 0; font-size: 12px; color: #94a3b8;">
                    © ${new Date().getFullYear()} VipTravel LLC. All rights reserved.<br>
                    This is an automated email from our authentication system.<br>
                    For inquiries: <a href="mailto:info@cnviptravel.com" style="color: #94a3b8;">info@cnviptravel.com</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
