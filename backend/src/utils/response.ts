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

    // location: JSON string → object
    let location = null;
    if (r.location) {
        try {
            location = typeof r.location === 'string'
                ? JSON.parse(r.location)
                : r.location;
        } catch {
            location = null;
        }
    }

    // JSON array талбарууд
    const parseArr = (v: any, def: any[] = []) => {
        if (!v) return def;
        if (Array.isArray(v)) return v;
        try { return JSON.parse(v); } catch { return def; }
    };

    return {
        _id: String(r.id),
        name: r.full_name || 'Guest',
        firstName: r.first_name || '',
        lastName: r.last_name || '',
        birthDate: r.birth_date || '',
        referralSource: r.referral_source || '',
        email: r.email,
        role,
        phone: r.phone || '',
        isPhoneVerified: phoneV,
        isEmailVerified: emailV,
        isVerified: !!r.isVerified,
        isAdmin: !!r.isAdmin,
        status: r.status || 'pending',
        profilePic: r.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
        coverPhoto: r.coverPhoto || null,

        // Profile талбарууд
        bio: r.bio || '',
        nationality: r.nationality || 'Mongolia',
        experience: r.experience || '',
        serviceDescription: r.serviceDescription || '',
        website: r.website || '',
        operatingHours: r.operatingHours || '',
        pricePerDay: r.pricePerDay || null,
        averageRating: r.averageRating || null,
        reviewCount: r.reviewCount || 0,

        // Map-д шаардлагатай
        location,

        // JSON array талбарууд
        blockedUsers: parseArr(r.blockedUsers),
        savedPostIds: parseArr(r.savedPostIds),
        travelPhotos: parseArr(r.travelPhotos),
        visitedPlaces: parseArr(r.visitedPlaces),
        languages: parseArr(r.languages),
        guidingLocations: parseArr(r.guidingLocations),
        examResults: parseArr(r.examResults),
        services: parseArr(r.services),
        amenities: parseArr(r.amenities),
        verificationData: r.verificationData
            ? (typeof r.verificationData === 'string'
                ? JSON.parse(r.verificationData)
                : r.verificationData)
            : null,

        privacy: { showEmail: false, showPhone: false, showOnlineStatus: true },
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        isOnline: true,
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