// Social Features Routes (Follow/Unfollow)

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';

/**
 * Follow a user
 */
export async function handleFollow(request: Request, env: Env): Promise<Response> {
    const body = await request.json() as any;
    const followerId = body.followerId || body.currentUserId;
    const followingId = body.followingId || body.targetUserId;
    
    if (!followerId || !followingId) {
        return new Response(JSON.stringify({ error: "followerId and followingId are required" }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }
    
    await env.DB.prepare(
        "INSERT INTO follows (followerId, followingId, created_at) VALUES (?, ?, ?)"
    ).bind(followerId, followingId, Date.now()).run();
    
    // Send follow notification
    if (String(followerId) !== String(followingId)) {
        const follower: any = await env.DB.prepare(
            "SELECT full_name FROM users WHERE CAST(id AS TEXT) = ?"
        ).bind(String(followerId)).first();
        
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await env.DB.prepare(`
            INSERT INTO notifications (id, recipientId, senderId, senderName, type, read, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(notifId, String(followingId), String(followerId), follower?.full_name || 'User', 'follow', 0, Date.now()).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Unfollow a user
 */
export async function handleUnfollow(request: Request, env: Env): Promise<Response> {
    const body = await request.json() as any;
    const followerId = body.followerId || body.currentUserId;
    const followingId = body.followingId || body.targetUserId;
    
    if (!followerId || !followingId) {
        return new Response(JSON.stringify({ error: "followerId and followingId are required" }), { 
            status: 400, 
            headers: corsHeaders 
        });
    }
    
    await env.DB.prepare(
        "DELETE FROM follows WHERE followerId = ? AND followingId = ?"
    ).bind(followerId, followingId).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
