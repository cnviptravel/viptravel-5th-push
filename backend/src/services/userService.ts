import { Env } from '../types/env';
import { AppError } from '../errors';
import { DatabaseService } from './database';
import { safeJsonParse } from '../utils/response';

/**
 * User service for user management operations
 */
export class UserService {
    constructor(
        private env: Env,
        private db: DatabaseService
    ) {}

    /**
     * Get all users (admin only)
     */
    async getAllUsers(): Promise<any[]> {
        return await this.db.queryAll('SELECT * FROM users ORDER BY created_at DESC');
    }

    /**
     * Get users by role
     */
    async getUsersByRole(role: string): Promise<any[]> {
        return await this.db.queryAll(
            "SELECT * FROM users WHERE role = ? AND status = 'approved' ORDER BY created_at DESC",
            role
        );
    }

    /**
     * Get user by ID with additional data
     */
    async getUserById(userId: string): Promise<any> {
        const user = await this.db.getUserById(userId);
        
        // Get followers
        const followers = await this.db.queryAll(
            "SELECT followerId FROM follows WHERE followingId = ?",
            userId
        );
        
        // Get following
        const following = await this.db.queryAll(
            "SELECT followingId FROM follows WHERE followerId = ?",
            userId
        );
        
        // Get reviews if user is a provider
        const reviews = user.role === 'provider' ? await this.db.queryAll(
            "SELECT * FROM reviews WHERE providerId = ? ORDER BY createdAt DESC",
            userId
        ) : [];
        
        return {
            ...user,
            followers: followers.map(r => r.followerId),
            following: following.map(r => r.followingId),
            reviews
        };
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, updates: any): Promise<any> {
        const existing = await this.db.getUserById(userId);
        
        // Prepare update data
        const updateData: any = {};
        
        if (updates.name !== undefined || updates.full_name !== undefined) {
            updateData.full_name = updates.name || updates.full_name || existing.full_name;
        }
        
        // Also handle firstName and lastName if provided
        if (updates.first_name !== undefined) {
            updateData.first_name = updates.first_name;
        }
        
        if (updates.last_name !== undefined) {
            updateData.last_name = updates.last_name;
        }
        
        if (updates.phone !== undefined) {
            updateData.phone = updates.phone;
        }
        
        if (updates.profilePic !== undefined) {
            updateData.profilePic = updates.profilePic;
        }
        
        if (updates.bio !== undefined) {
            updateData.bio = updates.bio;
        }
        
        if (updates.nationality !== undefined) {
            updateData.nationality = updates.nationality;
        }
        
        if (updates.experience !== undefined) {
            updateData.experience = updates.experience;
        }
        
        if (updates.serviceDescription !== undefined) {
            updateData.serviceDescription = updates.serviceDescription;
        }
        
        if (updates.visitedPlaces !== undefined) {
            updateData.visitedPlaces = Array.isArray(updates.visitedPlaces) 
                ? JSON.stringify(updates.visitedPlaces) 
                : updates.visitedPlaces;
        }
        
        if (updates.languages !== undefined) {
            updateData.languages = Array.isArray(updates.languages) 
                ? JSON.stringify(updates.languages) 
                : updates.languages;
        }
        
        if (updates.guidingLocations !== undefined) {
            updateData.guidingLocations = Array.isArray(updates.guidingLocations) 
                ? JSON.stringify(updates.guidingLocations) 
                : updates.guidingLocations;
        }
        
        if (updates.verificationData !== undefined) {
            updateData.verificationData = JSON.stringify(updates.verificationData);
        }
        
        if (updates.examResults !== undefined) {
            updateData.examResults = JSON.stringify(updates.examResults);
        }
        
        if (updates.coverPhoto !== undefined) {
            updateData.coverPhoto = updates.coverPhoto;
        }
        
        if (updates.isPhoneVerified !== undefined) {
            updateData.isPhoneVerified = updates.isPhoneVerified ? 1 : 0;
        }
        
        if (updates.location !== undefined) {
            updateData.location = JSON.stringify(updates.location);
        }
        
        // Update user
        await this.db.updateUser(userId, updateData);
        
        // Update userName and userPic in all posts by this user
        if (updateData.full_name || updateData.profilePic) {
            await this.db.execute(
                "UPDATE posts SET userName = ?, userPic = ? WHERE CAST(userId AS TEXT) = CAST(? AS TEXT)",
                updateData.full_name || existing.full_name,
                updateData.profilePic || existing.profilePic,
                userId
            );
        }
        
        // Update userName in comments across all posts
        if (updateData.full_name) {
            const allPosts = await this.db.queryAll("SELECT id, comments FROM posts");
            
            for (const post of allPosts) {
                try {
                    const comments = safeJsonParse(post.comments, []);
                    let changed = false;
                    
                    for (const comment of comments) {
                        if (String(comment.userId) === String(userId) && comment.userName !== updateData.full_name) {
                            comment.userName = updateData.full_name;
                            changed = true;
                        }
                    }
                    
                    if (changed) {
                        await this.db.execute(
                            "UPDATE posts SET comments = ? WHERE id = ?",
                            JSON.stringify(comments),
                            post.id
                        );
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
        
        return await this.db.getUserById(userId);
    }

    /**
     * Update user status (admin only)
     */
    async updateUserStatus(userId: string, status: string): Promise<void> {
        await this.db.execute(
            "UPDATE users SET status = ? WHERE id = ?",
            status, userId
        );
        
        // When admin approves → also set isVerified = 1
        // When admin rejects → set isVerified = 0
        if (status === 'approved') {
            await this.db.execute(
                "UPDATE users SET isVerified = 1 WHERE id = ?",
                userId
            );
        } else if (status === 'rejected') {
            await this.db.execute(
                "UPDATE users SET isVerified = 0 WHERE id = ?",
                userId
            );
        }
        
        // Send notification only for approved/rejected (NOT for pending)
        if (status === 'approved' || status === 'rejected') {
            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            await this.db.execute(
                `INSERT INTO notifications (id, recipientId, senderId, senderName, type, read, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                notifId, String(userId), 'admin', 'Admin', status, 0, Date.now()
            );
        }
    }

    /**
     * Delete user (admin only)
     */
    async deleteUser(userId: string): Promise<void> {
        await this.db.deleteUser(userId);
    }

    /**
     * Add travel photo
     */
    async addTravelPhoto(userId: string, photoUrl: string): Promise<any> {
        const user = await this.db.getUserById(userId);
        let photos = safeJsonParse(user.travelPhotos, []);
        
        photos = [photoUrl, ...photos];
        
        await this.db.execute(
            "UPDATE users SET travelPhotos = ? WHERE id = ?",
            JSON.stringify(photos), userId
        );
        
        return await this.db.getUserById(userId);
    }

    /**
     * Delete travel photo
     */
    async deleteTravelPhoto(userId: string, photoUrl: string): Promise<any> {
        const user = await this.db.getUserById(userId);
        let photos = safeJsonParse(user.travelPhotos, []);
        
        photos = photos.filter((p: string) => p !== photoUrl);
        
        await this.db.execute(
            "UPDATE users SET travelPhotos = ? WHERE id = ?",
            JSON.stringify(photos), userId
        );
        
        return await this.db.getUserById(userId);
    }

    /**
     * Block user
     */
    async blockUser(currentUserId: string, targetUserId: string): Promise<any> {
        const user = await this.db.getUserById(currentUserId);
        let blocked = safeJsonParse(user.blockedUsers, []);
        
        if (!blocked.includes(targetUserId)) {
            blocked.push(targetUserId);
        }
        
        await this.db.execute(
            "UPDATE users SET blockedUsers = ? WHERE id = ?",
            JSON.stringify(blocked), currentUserId
        );
        
        return await this.db.getUserById(currentUserId);
    }

    /**
     * Unblock user
     */
    async unblockUser(currentUserId: string, targetUserId: string): Promise<any> {
        const user = await this.db.getUserById(currentUserId);
        let blocked = safeJsonParse(user.blockedUsers, []);
        
        blocked = blocked.filter((id: string) => id !== targetUserId);
        
        await this.db.execute(
            "UPDATE users SET blockedUsers = ? WHERE id = ?",
            JSON.stringify(blocked), currentUserId
        );
        
        return await this.db.getUserById(currentUserId);
    }

    /**
     * Follow user
     */
    async followUser(followerId: string, followingId: string): Promise<void> {
        // Check if already following
        const exists = await this.db.queryFirst(
            "SELECT 1 FROM follows WHERE followerId = ? AND followingId = ?",
            followerId, followingId
        );
        
        if (!exists) {
            await this.db.execute(
                "INSERT INTO follows (followerId, followingId, createdAt) VALUES (?, ?, ?)",
                followerId, followingId, Date.now()
            );
            
            // Create notification
            const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const follower = await this.db.getUserById(followerId);
            
            await this.db.execute(
                `INSERT INTO notifications (id, recipientId, senderId, senderName, type, read, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                notifId, followingId, followerId, follower.full_name || 'User', 'follow', 0, Date.now()
            );
        }
    }

    /**
     * Unfollow user
     */
    async unfollowUser(followerId: string, followingId: string): Promise<void> {
        await this.db.execute(
            "DELETE FROM follows WHERE followerId = ? AND followingId = ?",
            followerId, followingId
        );
    }

    /**
     * Get user's followers
     */
    async getFollowers(userId: string): Promise<any[]> {
        const followers = await this.db.queryAll(
            "SELECT followerId FROM follows WHERE followingId = ?",
            userId
        );
        
        // Get user details for each follower
        const followerDetails = await Promise.all(
            followers.map(async (f: any) => {
                return await this.db.getUserById(f.followerId);
            })
        );
        
        return followerDetails;
    }

    /**
     * Get users that a user is following
     */
    async getFollowing(userId: string): Promise<any[]> {
        const following = await this.db.queryAll(
            "SELECT followingId FROM follows WHERE followerId = ?",
            userId
        );
        
        // Get user details for each followed user
        const followingDetails = await Promise.all(
            following.map(async (f: any) => {
                return await this.db.getUserById(f.followingId);
            })
        );
        
        return followingDetails;
    }
}

/**
 * Helper method for checking multiple conditions
 */
DatabaseService.prototype.exists = async function(table: string, column1: string, value1: any, column2?: string, value2?: any): Promise<boolean> {
    let sql = `SELECT 1 FROM ${table} WHERE ${column1} = ?`;
    const params: any[] = [value1];
    
    if (column2 && value2 !== undefined) {
        sql += ` AND ${column2} = ?`;
        params.push(value2);
    }
    
    const result = await this.queryFirst(sql, ...params);
    return !!result;
};

/**
 * Create user service instance
 */
export function createUserService(env: Env): UserService {
    const db = new DatabaseService(env);
    return new UserService(env, db);
}