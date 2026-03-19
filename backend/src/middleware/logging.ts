import { Env } from '../types/env';

/**
 * Request logging middleware
 */
export async function logRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<void> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        method,
        path,
        ip,
        userAgent,
        query: Object.fromEntries(url.searchParams),
        cfRay: request.headers.get('CF-Ray'),
        country: request.headers.get('CF-IPCountry')
    };
    
    // Log to console
    console.log(`[${logEntry.timestamp}] ${method} ${path} - ${ip} - ${userAgent.substring(0, 50)}...`);
    
    // Store in database if needed
    try {
        await env.DB.prepare(`
            INSERT INTO request_logs (timestamp, method, path, ip, userAgent, query, cfRay, country)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            logEntry.timestamp,
            method,
            path,
            ip,
            userAgent,
            JSON.stringify(logEntry.query),
            logEntry.cfRay,
            logEntry.country
        ).run();
    } catch (error) {
        // Ignore logging errors
        console.error('Failed to log request:', error);
    }
}

/**
 * Response logging middleware
 */
export function logResponse(response: Response, startTime: number): Response {
    const duration = Date.now() - startTime;
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`Response: ${status} ${statusText} - ${duration}ms`);
    
    // Add performance header
    const headers = new Headers(response.headers);
    headers.set('X-Response-Time', `${duration}ms`);
    
    // Return new response with added headers
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

/**
 * Error logging middleware
 */
export function logError(error: any, request: Request): void {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    
    console.error(`[ERROR] ${method} ${path}:`, error);
    
    // Log error details
    const errorLog = {
        timestamp: new Date().toISOString(),
        method,
        path,
        error: error.message || String(error),
        stack: error.stack,
        requestId: request.headers.get('CF-Ray')
    };
    
    // You could also send to error tracking service here
}

/**
 * Performance monitoring middleware
 */
export async function withPerformanceMonitoring(
    handler: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>,
    request: Request,
    env: Env,
    ctx: ExecutionContext
): Promise<Response> {
    const startTime = Date.now();
    
    try {
        // Log request
        await logRequest(request, env, ctx);
        
        // Execute handler
        const response = await handler(request, env, ctx);
        
        // Log response and add performance headers
        return logResponse(response, startTime);
    } catch (error) {
        // Log error
        logError(error, request);
        throw error;
    }
}