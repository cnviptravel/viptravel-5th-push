import { Env } from '../types/env';
import { AppError } from '../errors';

/**
 * Database service for common operations
 */
export class DatabaseService {
    constructor(private env: Env) {}

    /**
     * Execute a query and return first result
     */
    async queryFirst<T = any>(sql: string, ...params: any[]): Promise<T | null> {
        try {
            const stmt = this.env.DB.prepare(sql).bind(...params);
            return await stmt.first() as T;
        } catch (error) {
            console.error('Database query error:', error);
            throw AppError.internal('Database error');
        }
    }

    /**
     * Execute a query and return all results
     */
    async queryAll<T = any>(sql: string, ...params: any[]): Promise<T[]> {
        try {
            const stmt = this.env.DB.prepare(sql).bind(...params);
            const result = await stmt.all();
            return result.results as T[];
        } catch (error) {
            console.error('Database query error:', error);
            throw AppError.internal('Database error');
        }
    }

    /**
     * Execute an insert/update/delete query
     */
    async execute(sql: string, ...params: any[]): Promise<void> {
        try {
            const stmt = this.env.DB.prepare(sql).bind(...params);
            await stmt.run();
        } catch (error) {
            console.error('Database execute error:', error);
            throw AppError.internal('Database error');
        }
    }

    /**
     * Check if a record exists
     */
    async exists(table: string, column: string, value: any): Promise<boolean> {
        const result = await this.queryFirst(
            `SELECT 1 FROM ${table} WHERE ${column} = ?`,
            value
        );
        return !!result;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<any> {
        const user = await this.queryFirst(
            'SELECT * FROM users WHERE id = ?',
            userId
        );
        
        if (!user) {
            throw AppError.notFound('User not found');
        }
        
        return user;
    }

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<any> {
        const user = await this.queryFirst(
            'SELECT * FROM users WHERE email = ?',
            email
        );
        
        return user;
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, updates: any): Promise<void> {
        const fields = Object.keys(updates);
        if (fields.length === 0) {
            return;
        }
        
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = fields.map(f => updates[f]);
        values.push(userId);
        
        await this.execute(
            `UPDATE users SET ${setClause} WHERE id = ?`,
            ...values
        );
    }

    /**
     * Create a new user
     */
    async createUser(userData: any): Promise<string> {
        const fields = Object.keys(userData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = fields.map(f => userData[f]);
        
        await this.execute(
            `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`,
            ...values
        );
        
        // Get the last inserted ID
        const result = await this.queryFirst('SELECT last_insert_rowid() as id');
        return result?.id?.toString() || '';
    }

    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<void> {
        await this.execute('DELETE FROM users WHERE id = ?', userId);
    }

    /**
     * Get paginated results
     */
    async getPaginated<T = any>(
        table: string,
        page: number = 1,
        limit: number = 20,
        where: string = '1=1',
        params: any[] = [],
        orderBy: string = 'created_at DESC'
    ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
        const offset = (page - 1) * limit;
        
        const [data, totalResult] = await Promise.all([
            this.queryAll<T>(
                `SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
                ...params, limit, offset
            ),
            this.queryFirst<{ count: number }>(
                `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`,
                ...params
            )
        ]);
        
        return {
            data,
            total: totalResult?.count || 0,
            page,
            limit
        };
    }
}

/**
 * Create database service instance
 */
export function createDatabaseService(env: Env): DatabaseService {
    return new DatabaseService(env);
}