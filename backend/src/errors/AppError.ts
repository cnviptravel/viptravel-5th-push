/**
 * Custom application error class
 */
export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public details?: any;

    constructor(message: string, statusCode: number = 500, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.details = details;
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, details?: any): AppError {
        return new AppError(message, 400, details);
    }

    static unauthorized(message: string = 'Unauthorized'): AppError {
        return new AppError(message, 401);
    }

    static forbidden(message: string = 'Forbidden'): AppError {
        return new AppError(message, 403);
    }

    static notFound(message: string = 'Resource not found'): AppError {
        return new AppError(message, 404);
    }

    static conflict(message: string = 'Conflict'): AppError {
        return new AppError(message, 409);
    }

    static internal(message: string = 'Internal server error'): AppError {
        return new AppError(message, 500);
    }
}

/**
 * Error handler middleware
 */
export function errorHandler(error: any): Response {
    console.error('Error:', error);

    if (error instanceof AppError) {
        return new Response(JSON.stringify({
            error: error.message,
            details: error.details,
            timestamp: new Date().toISOString()
        }), {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Handle database errors
    if (error.message?.includes('SQLITE_ERROR') || error.message?.includes('database')) {
        return new Response(JSON.stringify({
            error: 'Database error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Default error response
    return new Response(JSON.stringify({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp: new Date().toISOString()
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
}