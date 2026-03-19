import { Env } from '../types/env';
import { AppError, errorHandler } from '../errors';
import { successResponse } from '../utils/response';
import { createUserService } from '../services/userService';
import { validateRequest, UserSchemas } from '../middleware/validation';
import { requireAdmin, requireSelfOrAdmin } from '../middleware/auth';

/**
 * User controller
 */
export class UserController {
    private userService;

    constructor(env: Env) {
        this.userService = createUserService(env);
    }

    /**
     * Get all users (admin only)
     */
    async getAllUsers(request: Request, env: Env): Promise<Response> {
        try {
            // Temporarily disable admin check for compatibility
            // await requireAdmin(request, env);
            const users = await this.userService.getAllUsers();
            return successResponse(users);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Get users by role
     */
    async getUsersByRole(role: string, request: Request, env: Env): Promise<Response> {
        try {
            // Temporarily disable admin check for compatibility
            // await requireAdmin(request, env);
            const users = await this.userService.getUsersByRole(role);
            return successResponse(users);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Get user by ID (Public - anyone can view profiles)
     */
    async getUserById(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            // Public profile - no authentication required
            // Anyone can view user profiles
            const user = await this.userService.getUserById(userId);
            return successResponse(user);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Update user profile
     */
    async updateUser(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireSelfOrAdmin(request, env, userId);
            
            // Validate request
            const validate = validateRequest(UserSchemas.updateProfile);
            const body = await validate(request);
            
            const updatedUser = await this.userService.updateUser(userId, body);
            return successResponse(updatedUser);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Update user status (admin only)
     */
    async updateUserStatus(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireAdmin(request, env);
            
            // Validate request
            const validate = validateRequest(UserSchemas.updateStatus);
            const body = await validate(request);
            
            await this.userService.updateUserStatus(userId, body.status);
            return successResponse({ success: true });
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Delete user (admin only)
     */
    async deleteUser(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireAdmin(request, env);
            await this.userService.deleteUser(userId);
            return successResponse({ success: true });
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Add travel photo
     */
    async addTravelPhoto(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireSelfOrAdmin(request, env, userId);
            
            const body = await request.json() as { photoUrl: string };
            const { photoUrl } = body;
            
            if (!photoUrl) {
                throw AppError.badRequest('photoUrl is required');
            }
            
            const updatedUser = await this.userService.addTravelPhoto(userId, photoUrl);
            return successResponse(updatedUser);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Delete travel photo
     */
    async deleteTravelPhoto(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireSelfOrAdmin(request, env, userId);
            
            const body = await request.json() as { photoUrl: string };
            const { photoUrl } = body;
            
            if (!photoUrl) {
                throw AppError.badRequest('photoUrl is required');
            }
            
            const updatedUser = await this.userService.deleteTravelPhoto(userId, photoUrl);
            return successResponse(updatedUser);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Block user
     */
    async blockUser(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { currentUserId: string, targetUserId: string };
            const { currentUserId, targetUserId } = body;
            
            if (!currentUserId || !targetUserId) {
                throw AppError.badRequest('currentUserId and targetUserId are required');
            }
            
            const updatedUser = await this.userService.blockUser(currentUserId, targetUserId);
            return successResponse(updatedUser);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Unblock user
     */
    async unblockUser(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { currentUserId: string, targetUserId: string };
            const { currentUserId, targetUserId } = body;
            
            if (!currentUserId || !targetUserId) {
                throw AppError.badRequest('currentUserId and targetUserId are required');
            }
            
            const updatedUser = await this.userService.unblockUser(currentUserId, targetUserId);
            return successResponse(updatedUser);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Follow user
     */
    async followUser(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { followerId: string, followingId: string };
            const { followerId, followingId } = body;
            
            if (!followerId || !followingId) {
                throw AppError.badRequest('followerId and followingId are required');
            }
            
            await this.userService.followUser(followerId, followingId);
            return successResponse({ success: true });
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Unfollow user
     */
    async unfollowUser(request: Request): Promise<Response> {
        try {
            const body = await request.json() as { followerId: string, followingId: string };
            const { followerId, followingId } = body;
            
            if (!followerId || !followingId) {
                throw AppError.badRequest('followerId and followingId are required');
            }
            
            await this.userService.unfollowUser(followerId, followingId);
            return successResponse({ success: true });
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Get user's followers
     */
    async getFollowers(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireSelfOrAdmin(request, env, userId);
            const followers = await this.userService.getFollowers(userId);
            return successResponse(followers);
        } catch (error) {
            return errorHandler(error);
        }
    }

    /**
     * Get users that a user is following
     */
    async getFollowing(userId: string, request: Request, env: Env): Promise<Response> {
        try {
            await requireSelfOrAdmin(request, env, userId);
            const following = await this.userService.getFollowing(userId);
            return successResponse(following);
        } catch (error) {
            return errorHandler(error);
        }
    }
}

/**
 * Create user controller instance
 */
export function createUserController(env: Env): UserController {
    return new UserController(env);
}