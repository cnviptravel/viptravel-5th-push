import { corsHeaders } from '../config/cors';

/**
 * Success response helper
 */
export function successResponse(data: any, statusCode: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Error response helper
 */
export function errorResponse(message: string, statusCode: number = 500, details?: any): Response {
    return new Response(JSON.stringify({
        error: message,
        details,
        timestamp: new Date().toISOString()
    }), {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
}

/**
 * Format user object for response (moved from auth.ts)
 */
export function formatUserResponse(r: any): any {
    const role = r.role || 'traveler';
    const emailV = !!r.isEmailVerified;
    const phoneV = !!r.isPhoneVerified;
    
    return {
        _id: String(r.id),
        name: r.full_name || "Guest",
        firstName: r.first_name || "",
        lastName: r.last_name || "",
        birthDate: r.birth_date || "",
        referralSource: r.referral_source || "",
        email: r.email,
        role: role,
        phone: r.phone || "",
        isPhoneVerified: phoneV,
        isEmailVerified: emailV,
        isVerified: !!r.isVerified,
        isAdmin: !!r.isAdmin,
        nationality: r.nationality || "Mongolia",
        privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
        blockedUsers: JSON.parse(r.blockedUsers || "[]"),
        savedPostIds: JSON.parse(r.savedPostIds || "[]"),
        travelPhotos: typeof r.travelPhotos === "string" ? JSON.parse(r.travelPhotos || "[]") : (r.travelPhotos || []),
        visitedPlaces: typeof r.visitedPlaces === "string" ? JSON.parse(r.visitedPlaces || "[]") : (r.visitedPlaces || []),
        languages: typeof r.languages === "string" ? JSON.parse(r.languages || "[]") : (r.languages || []),
        examResults: typeof r.examResults === "string" ? JSON.parse(r.examResults || "[]") : (r.examResults || []),
        status: r.status || 'pending',
        profilePic: r.profilePic || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        isOnline: true
    };
}

/**
 * Parse JSON safely
 */
export function safeJsonParse(str: string, defaultValue: any = []): any {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}