// User Management Routes
// Uses controllers for business logic

import { Env } from '../types/env';
import { createUserController } from '../controllers/users';

/**
 * Get all users (admin only)
 */
export async function handleGetUsers(env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.getAllUsers(new Request(''), env);
}

/**
 * Get users by role
 */
export async function handleGetUsersByRole(role: string, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.getUsersByRole(role, new Request(''), env);
}

/**
 * Get user by ID
 */
export async function handleGetUser(userId: string, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.getUserById(userId, new Request(''), env);
}

/**
 * Update user profile
 */
export async function handleUpdateUser(userId: string, request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.updateUser(userId, request, env);
}

/**
 * Update user status (admin only)
 */
export async function handleUpdateUserStatus(userId: string, request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.updateUserStatus(userId, request, env);
}

/**
 * Delete user (admin only)
 */
export async function handleDeleteUser(userId: string, request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.deleteUser(userId, request, env);
}

/**
 * Add travel photo
 */
export async function handleAddTravelPhoto(userId: string, request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.addTravelPhoto(userId, request, env);
}

/**
 * Delete travel photo
 */
export async function handleDeleteTravelPhoto(userId: string, request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.deleteTravelPhoto(userId, request, env);
}

/**
 * Block user
 */
export async function handleBlockUser(request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.blockUser(request);
}

/**
 * Unblock user
 */
export async function handleUnblockUser(request: Request, env: Env): Promise<Response> {
    const controller = createUserController(env);
    return await controller.unblockUser(request);
}
