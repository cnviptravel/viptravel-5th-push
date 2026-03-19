import { AppError } from '../errors';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (Mongolian format)
 */
export function validatePhone(phone: string): boolean {
    const phoneRegex = /^(\+976|976)?[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate required fields in request body
 */
export function validateRequired(body: any, fields: string[]): void {
    const missing = fields.filter(field => !body[field] && body[field] !== 0);
    if (missing.length > 0) {
        throw AppError.badRequest(`Missing required fields: ${missing.join(', ')}`);
    }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
    if (password.length < 6) {
        throw AppError.badRequest('Password must be at least 6 characters long');
    }
}

/**
 * Validate role
 */
export function validateRole(role: string): void {
    const validRoles = ['traveler', 'guide', 'provider', 'admin'];
    if (!validRoles.includes(role)) {
        throw AppError.badRequest(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
}

/**
 * Validate status
 */
export function validateStatus(status: string): void {
    const validStatuses = ['pending', 'approved', 'rejected', 'blocked'];
    if (!validStatuses.includes(status)) {
        throw AppError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
}

/**
 * Validate numeric ID
 */
export function validateId(id: string): void {
    if (!id || id.trim() === '') {
        throw AppError.badRequest('ID is required');
    }
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page: number, limit: number): void {
    if (page < 1) {
        throw AppError.badRequest('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
        throw AppError.badRequest('Limit must be between 1 and 100');
    }
}

/**
 * Validate date format
 */
export function validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Validate JSON string
 */
export function validateJsonString(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch {
        return false;
    }
}