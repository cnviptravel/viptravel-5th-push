import { AppError } from '../errors';
import { validateEmail, validatePhone, validateRequired, validatePassword, validateRole, validateStatus } from '../utils/validation';

/**
 * Request validation middleware
 */
export function validateRequest(schema: ValidationSchema) {
    return async function(request: Request): Promise<any> {
        let body: any = {};
        
        try {
            // Parse request body based on content type
            const contentType = request.headers.get('Content-Type') || '';
            
            if (contentType.includes('application/json')) {
                // Clone request to avoid "body already read" error
                const clonedRequest = request.clone();
                body = await clonedRequest.json();
            } else if (contentType.includes('multipart/form-data')) {
                // For form data, we'll handle it differently
                const formData = await request.formData();
                body = Object.fromEntries(formData.entries());
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const text = await request.text();
                const params = new URLSearchParams(text);
                body = Object.fromEntries(params.entries());
            } else {
                // Default to JSON if no content type specified
                const clonedRequest = request.clone();
                body = await clonedRequest.json();
            }
        } catch (error) {
            console.error('Validation error:', error);
            throw AppError.badRequest('Invalid request body');
        }
        
        // Validate required fields
        if (schema.required) {
            validateRequired(body, schema.required);
        }
        
        // Validate each field
        for (const [field, rules] of Object.entries(schema.fields || {})) {
            const value = body[field];
            
            // Skip validation if field is optional and not provided
            if (value === undefined || value === null) {
                if (rules.required) {
                    throw AppError.badRequest(`Field '${field}' is required`);
                }
                continue;
            }
            
            // Type validation
            if (rules.type) {
                validateType(field, value, rules.type);
            }
            
            // Custom validation
            if (rules.validate) {
                const isValid = rules.validate(value);
                if (!isValid) {
                    throw AppError.badRequest(`Invalid value for field '${field}'`);
                }
            }
            
            // Min/Max length validation
            if (typeof value === 'string') {
                if (rules.minLength && value.length < rules.minLength) {
                    throw AppError.badRequest(`Field '${field}' must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && value.length > rules.maxLength) {
                    throw AppError.badRequest(`Field '${field}' must be at most ${rules.maxLength} characters`);
                }
            }
            
            // Min/Max value validation (for numbers)
            if (typeof value === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    throw AppError.badRequest(`Field '${field}' must be at least ${rules.min}`);
                }
                if (rules.max !== undefined && value > rules.max) {
                    throw AppError.badRequest(`Field '${field}' must be at most ${rules.max}`);
                }
            }
            
            // Pattern validation
            if (rules.pattern && typeof value === 'string') {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(value)) {
                    throw AppError.badRequest(`Field '${field}' does not match required pattern`);
                }
            }
            
            // Enum validation
            if (rules.enum && !rules.enum.includes(value)) {
                throw AppError.badRequest(`Field '${field}' must be one of: ${rules.enum.join(', ')}`);
            }
        }
        
        return body;
    };
}

/**
 * Validate field type
 */
function validateType(field: string, value: any, type: string): void {
    switch (type) {
        case 'string':
            if (typeof value !== 'string') {
                throw AppError.badRequest(`Field '${field}' must be a string`);
            }
            break;
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) {
                throw AppError.badRequest(`Field '${field}' must be a number`);
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                throw AppError.badRequest(`Field '${field}' must be a boolean`);
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                throw AppError.badRequest(`Field '${field}' must be an array`);
            }
            break;
        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                throw AppError.badRequest(`Field '${field}' must be an object`);
            }
            break;
        case 'email':
            if (typeof value !== 'string' || !validateEmail(value)) {
                throw AppError.badRequest(`Field '${field}' must be a valid email address`);
            }
            break;
        case 'phone':
            if (typeof value !== 'string' || !validatePhone(value)) {
                throw AppError.badRequest(`Field '${field}' must be a valid phone number`);
            }
            break;
        case 'password':
            if (typeof value !== 'string') {
                throw AppError.badRequest(`Field '${field}' must be a string`);
            }
            validatePassword(value);
            break;
        case 'role':
            validateRole(value);
            break;
        case 'status':
            validateStatus(value);
            break;
    }
}

/**
 * Validation schema interface
 */
export interface ValidationSchema {
    required?: string[];
    fields?: {
        [field: string]: {
            type?: string;
            required?: boolean;
            minLength?: number;
            maxLength?: number;
            min?: number;
            max?: number;
            pattern?: string;
            enum?: any[];
            validate?: (value: any) => boolean;
        };
    };
}

/**
 * Common validation schemas
 */
export const AuthSchemas = {
    login: {
        required: ['email', 'password'],
        fields: {
            email: { type: 'email' },
            password: { type: 'string', minLength: 6 }
        }
    },
    register: {
        required: ['email', 'password'],
        fields: {
            email: { type: 'email' },
            password: { type: 'password' },
            full_name: { type: 'string', minLength: 2 },
            phone: { type: 'phone' },
            role: { type: 'role' }
        }
    },
    otpSend: {
        required: ['type', 'identifier'],
        fields: {
            type: { type: 'string', enum: ['email', 'telegram'] },
            identifier: { type: 'string' }
        }
    },
    otpVerify: {
        required: ['type', 'identifier', 'code'],
        fields: {
            type: { type: 'string', enum: ['email', 'telegram'] },
            identifier: { type: 'string' },
            code: { type: 'string', minLength: 4 }
        }
    }
};

export const UserSchemas = {
    updateProfile: {
        fields: {
            name: { type: 'string', minLength: 2 },
            phone: { type: 'phone' },
            profilePic: { type: 'string' },
            bio: { type: 'string', maxLength: 500 },
            nationality: { type: 'string' },
            experience: { type: 'string', maxLength: 1000 },
            serviceDescription: { type: 'string', maxLength: 1000 }
        }
    },
    updateStatus: {
        required: ['status'],
        fields: {
            status: { type: 'status' }
        }
    }
};

export const PostSchemas = {
    create: {
        required: ['userId', 'content'],
        fields: {
            userId: { type: 'string' },
            content: { type: 'string', minLength: 1, maxLength: 5000 },
            images: { type: 'array' },
            location: { type: 'object' }
        }
    },
    addComment: {
        required: ['userId', 'content'],
        fields: {
            userId: { type: 'string' },
            content: { type: 'string', minLength: 1, maxLength: 1000 }
        }
    }
};