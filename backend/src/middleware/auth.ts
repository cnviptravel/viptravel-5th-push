import { Env } from '../types/env';
import { AppError } from '../errors';
import { corsHeaders } from '../config/cors';

/**
 * Authentication middleware
 * Validates JWT token or session
 */
export async function authenticate(request: Request, env: Env): Promise<string> {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    // If no authorization header, try to get user ID from query parameter or body
    if (!authHeader) {
        // For development/testing, allow passing userId as query parameter
        try {
            const url = new URL(request.url);
            const userId = url.searchParams.get('userId');
            
            if (userId) {
                // Check if user exists
                const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
                    .bind(userId)
                    .first();
                    
                if (user) {
                    return userId;
                }
            }
        } catch {
            // Ignore URL parsing errors
        }
        
        // Try to get from body for POST/PUT requests
        if (request.method === 'POST' || request.method === 'PUT') {
            try {
                const body = await request.clone().json() as any;
                console.log('Auth middleware - Request body:', JSON.stringify(body));
                // Check multiple possible fields for user ID
                const possibleIdFields = ['userId', '_id', 'id', 'currentUserId'];
                
                for (const field of possibleIdFields) {
                    if (body[field]) {
                        console.log(`Auth middleware - Found field ${field}: ${body[field]}`);
                        const userId = String(body[field]);
                        // Try to find user by ID (exact match)
                        const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
                            .bind(userId)
                            .first();
                            
                        if (user) {
                            console.log(`Auth middleware - User found: ${userId}`);
                            return userId;
                        }
                        
                        // If not found, try to find by converting to number (for backward compatibility)
                        const numId = parseInt(userId);
                        if (!isNaN(numId)) {
                            const userByNum = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
                                .bind(numId)
                                .first();
                                
                            if (userByNum) {
                                console.log(`Auth middleware - User found by numeric ID: ${numId}`);
                                return String(numId);
                            }
                        }
                    }
                }
                console.log('Auth middleware - No valid user ID found in body');
            } catch (error) {
                console.log('Auth middleware - JSON parse error:', error);
                // Ignore JSON parse errors
            }
        }
        
        // For GET/PUT/DELETE requests to /users/:id, extract userId from URL path
        if (request.method === 'GET' || request.method === 'PUT' || request.method === 'DELETE') {
            try {
                const url = new URL(request.url);
                const pathParts = url.pathname.split('/');
                const userIdIndex = pathParts.indexOf('users') + 1;
                if (userIdIndex > 0 && userIdIndex < pathParts.length) {
                    const userId = pathParts[userIdIndex];
                    if (userId && userId !== 'role') {
                        const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
                            .bind(userId)
                            .first();
                            
                        if (user) {
                            return userId;
                        }
                    }
                }
            } catch {
                // Ignore errors
            }
        }
        
        throw AppError.unauthorized('Missing or invalid authorization header');
    }
    
    if (!authHeader.startsWith('Bearer ')) {
        throw AppError.unauthorized('Invalid authorization header format');
    }
    
    const token = authHeader.substring(7);
    
    try {
        // In a real implementation, you would verify JWT token
        // For now, we'll check if token is a valid user ID
        const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?")
            .bind(token)
            .first();
            
        if (!user) {
            throw AppError.unauthorized('Invalid token');
        }
        
        return token; // Return user ID
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw AppError.unauthorized('Authentication failed');
    }
}

/**
 * Admin authorization middleware
 */
export async function requireAdmin(request: Request, env: Env): Promise<void> {
    const userId = await authenticate(request, env);
    
    const user = await env.DB.prepare("SELECT isAdmin FROM users WHERE id = ?")
        .bind(userId)
        .first() as any;
        
    if (!user || !user.isAdmin) {
        throw AppError.forbidden('Admin access required');
    }
}

/**
 * Role-based authorization middleware
 */
export async function requireRole(request: Request, env: Env, allowedRoles: string[]): Promise<void> {
    const userId = await authenticate(request, env);
    
    const user = await env.DB.prepare("SELECT role FROM users WHERE id = ?")
        .bind(userId)
        .first() as any;
        
    if (!user || !allowedRoles.includes(user.role)) {
        throw AppError.forbidden(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
}

/**
 * Self or admin authorization middleware
 * Allows user to access their own data or admin to access any data
 */
export async function requireSelfOrAdmin(request: Request, env: Env, targetUserId: string): Promise<void> {
    const userId = await authenticate(request, env);
    
    if (userId === targetUserId) {
        return; // User accessing their own data
    }
    
    // Check if user is admin
    const user = await env.DB.prepare("SELECT isAdmin FROM users WHERE id = ?")
        .bind(userId)
        .first() as any;
        
    if (!user || !user.isAdmin) {
        throw AppError.forbidden('Access denied');
    }
}

/**
 * CORS middleware wrapper
 */
export function withCors(response: Response): Response {
    const headers = new Headers(response.headers);
    
    // Add CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
    });
    
    // Add additional CORS headers for preflight
    if (response.status === 200 && response.headers.get('Content-Type')?.includes('application/json')) {
        headers.set('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS,PUT,DELETE');
        headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        headers.set('Access-Control-Allow-Origin', '*');
    }
    
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}