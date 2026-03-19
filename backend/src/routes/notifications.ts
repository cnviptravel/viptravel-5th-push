// Notifications Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';

/**
 * Get notifications for a user
 */
export async function handleGetNotifications(userId: string, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(`
        SELECT * FROM notifications 
        WHERE recipientId = ? AND type NOT LIKE '%call%' 
        ORDER BY createdAt DESC 
        LIMIT 50
    `).bind(userId).all();
    
    return new Response(JSON.stringify(results.map(n => ({ ...n, read: !!n.read }))), { 
        headers: corsHeaders 
    });
}

/**
 * Mark all notifications as read
 */
export async function handleMarkNotificationsRead(userId: string, env: Env): Promise<Response> {
    await env.DB.prepare(
        "UPDATE notifications SET read = 1 WHERE recipientId = ?"
    ).bind(userId).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
