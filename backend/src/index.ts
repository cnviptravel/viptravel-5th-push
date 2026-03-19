// VipTravel Backend - MODULAR VERSION

// Import types and config
import { Env } from './types/env';
import { corsHeaders } from './config/cors';

// Import route handlers
import {
    handleLogin,
    handleRegister,
    handleOtpSend,
    handleOtpVerify,
    handleTelegramWebhook
} from './routes/auth';

import {
    handleGetUsers,
    handleGetUsersByRole,
    handleGetUser,
    handleUpdateUser,
    handleUpdateUserStatus,
    handleDeleteUser,
    handleAddTravelPhoto,
    handleDeleteTravelPhoto,
    handleBlockUser,
    handleUnblockUser
} from './routes/users';

import {
    handleGetConversation,
    handleSendMessage,
    handleMarkMessagesRead,
    handleDeleteMessage,
    handleDeleteConversation,
    handleGetUnreadCount,
    handleGetConversations,
    handleMessageReaction,
    handleMarkMessageRead,
    handleForwardMessage
} from './routes/messages';

import {
    handleGetTurnCredentials,
    handleInitiateCall,
    handleCallAccepted,
    handleSendTracks,
    handleEndCall,
    handleCloudflareCallsProxy
} from './routes/calls';

import {
    handleCreatePost,
    handleGetPosts,
    handleDeletePost,
    handleAddComment,
    handleGetSavedPosts,
    handleLikePost,
    handleSavePost,
    handleCreateBooking,
    handleGetBookings,
    handleAddReview
} from './routes/posts';

import {
    handleFollow,
    handleUnfollow
} from './routes/social';

import {
    handleUpload,
    handleGetImage
} from './routes/upload';

import {
    handleGetNotifications,
    handleMarkNotificationsRead
} from './routes/notifications';

import {
    handleGetMapboxToken,
    handleGetConfig,
    handleUpdateConfig
} from './routes/config';

import {
    handleTranslate,
    handleTranslateAudio,
    handleAiPlan,
    handleTranscribe
} from './routes/translate';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        if (method === "OPTIONS") {
            return new Response(null, {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,PUT,DELETE",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }

        try {
            // 1. AUTHENTICATION ROUTES
            if (method === "POST" && path === "/login") {
                return handleLogin(request, env);
            }

            if (method === "POST" && path === "/register") {
                return handleRegister(request, env);
            }

            if (method === "POST" && path === "/auth/otp/send") {
                return handleOtpSend(request, env);
            }

            if (method === "POST" && path === "/auth/otp/verify") {
                return handleOtpVerify(request, env);
            }

            if (method === "POST" && path === "/telegram/webhook") {
                return handleTelegramWebhook(request, env);
            }

            // 2. USER MANAGEMENT ROUTES
            if (method === "GET" && path === "/users") {
                return handleGetUsers(env);
            }

            if (method === "GET" && path.startsWith("/users/role/")) {
                const role = path.split("/")[3];
                return handleGetUsersByRole(role, env);
            }

            if (method === "GET" && path.match(/^\/users\/[^/]+$/)) {
                const userId = path.split("/")[2];
                return handleGetUser(userId, env);
            }

            if (method === "PUT" && path.match(/^\/users\/[^/]+$/)) {
                const userId = path.split("/")[2];
                return handleUpdateUser(userId, request, env);
            }

            if (method === "POST" && path.match(/^\/users\/[^/]+\/status$/)) {
                const userId = path.split("/")[2];
                return handleUpdateUserStatus(userId, request, env);
            }

            if (method === "DELETE" && path.match(/^\/users\/[^/]+$/)) {
                const userId = path.split("/")[2];
                return handleDeleteUser(userId, request, env);
            }

            if (method === "POST" && path.match(/^\/users\/[^/]+\/photos$/)) {
                const userId = path.split("/")[2];
                return handleAddTravelPhoto(userId, request, env);
            }

            if (method === "POST" && path.match(/^\/users\/[^/]+\/photos\/delete$/)) {
                const userId = path.split("/")[2];
                return handleDeleteTravelPhoto(userId, request, env);
            }

            if (method === "POST" && path === "/users/block") {
                return handleBlockUser(request, env);
            }

            if (method === "POST" && path === "/users/unblock") {
                return handleUnblockUser(request, env);
            }

            // 3. MESSAGES & CHAT ROUTES
            if (method === "GET" && path.match(/^\/messages\/[^/]+\/[^/]+$/)) {
                const parts = path.split("/");
                const u1 = parts[2];
                const u2 = parts[3];
                return handleGetConversation(u1, u2, env);
            }

            if (method === "POST" && path === "/messages") {
                return handleSendMessage(request, env, ctx);
            }

            if (method === "POST" && path === "/messages/read") {
                return handleMarkMessagesRead(request, env);
            }

            if (method === "DELETE" && path.match(/^\/messages\/[^/]+$/)) {
                const msgId = decodeURIComponent(path.split("/")[2]);
                return handleDeleteMessage(msgId, env);
            }

            if (method === "DELETE" && path.match(/^\/conversations\/[^/]+\/[^/]+$/)) {
                const parts = path.split("/");
                const u1 = parts[2];
                const u2 = parts[3];
                return handleDeleteConversation(u1, u2, env);
            }

            if (method === "GET" && path.match(/^\/messages\/unread\/count\/[^/]+$/)) {
                const userId = path.split("/")[4];
                return handleGetUnreadCount(userId, env);
            }

            if (method === "GET" && path.match(/^\/conversations\/[^/]+$/)) {
                const myId = path.split("/")[2];
                return handleGetConversations(myId, env);
            }

            // New Facebook Messenger features routes
            if (method === "POST" && path === "/messages/reaction") {
                return handleMessageReaction(request, env, ctx);
            }

            if (method === "POST" && path === "/messages/mark-read") {
                return handleMarkMessageRead(request, env);
            }

            if (method === "POST" && path === "/messages/forward") {
                return handleForwardMessage(request, env, ctx);
            }

            // 4. CALLS & WEBRTC ROUTES
            if (method === "GET" && path === "/calls/turn-credentials") {
                return handleGetTurnCredentials(env);
            }

            if (method === "POST" && path === "/messages/call") {
                return handleInitiateCall(request, env, ctx);
            }

            if (method === "POST" && path === "/messages/call/accepted") {
                return handleCallAccepted(request, env, ctx);
            }

            if (method === "POST" && path === "/messages/call/tracks") {
                return handleSendTracks(request, env, ctx);
            }

            if (method === "POST" && path === "/messages/call/end") {
                return handleEndCall(request, env, ctx);
            }

            if ((method === "POST" || method === "PUT") && path.startsWith("/calls/")) {
                const parts = path.split("/");
                return handleCloudflareCallsProxy(request, env, parts);
            }

            // 5. POSTS, BOOKINGS & REVIEWS ROUTES
            if (method === "POST" && path === "/posts") {
                return handleCreatePost(request, env);
            }

            if (method === "GET" && path === "/posts") {
                return handleGetPosts(env);
            }

            if (method === "DELETE" && path.match(/^\/posts\/[^/]+$/)) {
                const postId = decodeURIComponent(path.split("/")[2]);
                return handleDeletePost(postId, env);
            }

            if (method === "POST" && path.match(/^\/posts\/[^/]+\/comment$/)) {
                const postId = decodeURIComponent(path.split("/")[2]);
                return handleAddComment(postId, request, env);
            }

            if (method === "POST" && path === "/posts/saved") {
                return handleGetSavedPosts(request, env);
            }

            if (method === "POST" && path.match(/^\/posts\/[^/]+\/like$/)) {
                const postId = path.split("/")[2];
                return handleLikePost(postId, request, env);
            }

            if (method === "POST" && path.match(/^\/users\/[^/]+\/save-post$/)) {
                const userId = path.split("/")[2];
                return handleSavePost(userId, request, env);
            }

            if (method === "POST" && path === "/bookings") {
                return handleCreateBooking(request, env);
            }

            if (method === "GET" && path.match(/^\/bookings\/[^/]+$/)) {
                const userId = path.split("/")[2];
                return handleGetBookings(userId, env);
            }

            if (method === "POST" && path.match(/^\/reviews\/[^/]+$/)) {
                const providerId = path.split("/")[2];
                return handleAddReview(providerId, request, env);
            }

            // 6. SOCIAL FEATURES ROUTES
            if (method === "POST" && path === "/follow") {
                return handleFollow(request, env);
            }

            if (method === "POST" && path === "/unfollow") {
                return handleUnfollow(request, env);
            }

            // 7. UPLOAD & IMAGE ROUTES
            if (method === "POST" && path === "/upload") {
                return handleUpload(request, env);
            }

            if (method === "GET" && path.startsWith("/image/")) {
                const key = decodeURIComponent(path.replace('/image/', ''));
                return handleGetImage(key, env);
            }

            // 8. NOTIFICATIONS ROUTES
            if (method === "GET" && path.match(/^\/notifications\/[^/]+$/)) {
                const userId = path.split("/")[2];
                return handleGetNotifications(userId, env);
            }

            if (method === "POST" && path.match(/^\/notifications\/[^/]+\/read$/)) {
                const userId = path.split("/")[2];
                return handleMarkNotificationsRead(userId, env);
            }

            // 9. CONFIG & MAPBOX ROUTES
            if (method === "GET" && path === "/mapbox-token") {
                return handleGetMapboxToken(env);
            }

            if (method === "GET" && path === "/config") {
                return handleGetConfig(env);
            }

            if (method === "POST" && path === "/config") {
                return handleUpdateConfig(request, env);
            }

            // 10. AI TRANSLATION & TRANSCRIPTION ROUTES
            if (method === "POST" && path === "/translate") {
                return handleTranslate(request, env);
            }

            if (method === "POST" && path === "/translate-audio") {
                return handleTranslateAudio(request, env);
            }

            if (method === "POST" && path === "/ai/plan") {
                return handleAiPlan(request, env);
            }

            if (method === "POST" && path === "/transcribe") {
                return handleTranscribe(request, env, ctx);
            }

            // Default response for unknown routes
            return new Response(JSON.stringify({ 
                message: "VipTravel Backend API",
                version: "modular-v1.0",
                available_endpoints: [
                    "POST /login", "POST /register", "POST /auth/otp/send", "POST /auth/otp/verify",
                    "GET /users", "GET /users/:id", "PUT /users/:id", "DELETE /users/:id",
                    "GET /messages/:u1/:u2", "POST /messages", "GET /conversations/:userId",
                    "GET /calls/turn-credentials", "POST /messages/call", "POST /messages/call/end",
                    "GET /posts", "POST /posts", "DELETE /posts/:id", "POST /posts/:id/comment",
                    "POST /follow", "POST /unfollow", "POST /upload", "GET /image/:key",
                    "GET /notifications/:userId", "GET /mapbox-token", "GET /config",
                    "POST /translate", "POST /transcribe", "POST /ai/plan"
                ]
            }), { 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });

        } catch (e: any) {
            console.error("Global error:", e);
            return new Response(JSON.stringify({ 
                error: "Internal server error", 
                details: e.message 
            }), { 
                status: 500, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }
    },
};