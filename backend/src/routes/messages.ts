// Chat and Messages Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { triggerPusher } from '../services/pusher';
import { logApiUsage } from '../utils/apiUsageLogger';

/**
 * Get conversation between two users
 */
export async function handleGetConversation(u1: string, u2: string, env: Env): Promise<Response> {
    try {
        const { results } = await env.DB.prepare(`
            SELECT * FROM messages 
            WHERE (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
               OR (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
            ORDER BY createdAt ASC
        `).bind(u1, u2, u2, u1).all();
        
        return new Response(JSON.stringify(results), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    } catch (e: any) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
}

/**
 * Send a message
 */
export async function handleSendMessage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const m = await request.json() as any;
    const msgId = `msg_${Date.now()}`;
    
    await env.DB.prepare(`
        INSERT INTO messages (id, senderId, receiverId, text, media, mediaType, fileName, createdAt, read, readAt, reactions, replyTo, forwardedFrom, delivered, seen, seenBy) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, '[]', ?, ?, 0, 0, '[]')
    `).bind(
        msgId, 
        String(m.senderId), 
        String(m.receiverId), 
        m.text || null, 
        m.media || null, 
        m.mediaType || null, 
        m.fileName || null, 
        Date.now(),
        m.replyTo ? JSON.stringify(m.replyTo) : null,
        m.forwardedFrom || null
    ).run();
    
    const newMessage = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(msgId).first();
    ctx.waitUntil(triggerPusher(env, `private-user-${m.receiverId}`, "chat-message", newMessage));
    
    await logApiUsage(env, 'pusher_message', 'chat_message', String(m.senderId), 1);
    
    return new Response(JSON.stringify(newMessage), { headers: corsHeaders });
}

/**
 * Mark messages as read
 */
export async function handleMarkMessagesRead(request: Request, env: Env): Promise<Response> {
    const { currentUserId, senderId } = await request.json() as any;
    await env.DB.prepare(`
        UPDATE messages SET read = 1 
        WHERE CAST(receiverId AS TEXT) = CAST(? AS TEXT) 
          AND CAST(senderId AS TEXT) = CAST(? AS TEXT)
    `).bind(currentUserId, senderId).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Delete a message
 */
export async function handleDeleteMessage(msgId: string, env: Env): Promise<Response> {
    await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(msgId).run();
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Delete entire conversation
 */
export async function handleDeleteConversation(u1: string, u2: string, env: Env): Promise<Response> {
    await env.DB.prepare(`
        DELETE FROM messages 
        WHERE (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
           OR (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
    `).bind(u1, u2, u2, u1).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Get unread message count
 */
export async function handleGetUnreadCount(userId: string, env: Env): Promise<Response> {
    const res: any = await env.DB.prepare(`
        SELECT COUNT(DISTINCT senderId) as count 
        FROM messages 
        WHERE CAST(receiverId AS TEXT) = CAST(? AS TEXT) AND read = 0
    `).bind(userId).first();
    
    return new Response(JSON.stringify(res), { headers: corsHeaders });
}

/**
 * Add or remove reaction to a message
 */
export async function handleMessageReaction(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { messageId, userId, reaction } = await request.json() as any;
    
    // Get current message
    const message: any = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(messageId).first();
    if (!message) {
        return new Response(JSON.stringify({ error: "Message not found" }), { status: 404, headers: corsHeaders });
    }
    
    let reactions = [];
    try {
        reactions = JSON.parse(message.reactions || '[]');
    } catch {
        reactions = [];
    }
    
    // Remove existing reaction from this user
    const filteredReactions = reactions.filter((r: any) => r.userId !== userId);
    
    // Add new reaction if provided
    if (reaction) {
        filteredReactions.push({
            userId,
            reaction,
            createdAt: Date.now()
        });
    }
    
    // Update message
    await env.DB.prepare(`
        UPDATE messages SET reactions = ? WHERE id = ?
    `).bind(JSON.stringify(filteredReactions), messageId).run();
    
    // Get updated message
    const updatedMessage = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(messageId).first();
    
    // Notify both users
    const senderId = message.senderId;
    const receiverId = message.receiverId;
    ctx.waitUntil(triggerPusher(env, `private-user-${senderId}`, "message-updated", updatedMessage));
    ctx.waitUntil(triggerPusher(env, `private-user-${receiverId}`, "message-updated", updatedMessage));
    
    return new Response(JSON.stringify(updatedMessage), { headers: corsHeaders });
}

/**
 * Mark message as read with timestamp
 */
export async function handleMarkMessageRead(request: Request, env: Env): Promise<Response> {
    const { messageId } = await request.json() as any;
    
    await env.DB.prepare(`
        UPDATE messages SET read = 1, readAt = ? WHERE id = ?
    `).bind(Date.now(), messageId).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Forward a message to another user
 */
export async function handleForwardMessage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { originalMessageId, senderId, receiverId } = await request.json() as any;
    
    // Get original message
    const original: any = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(originalMessageId).first();
    if (!original) {
        return new Response(JSON.stringify({ error: "Original message not found" }), { status: 404, headers: corsHeaders });
    }
    
    // Create new message with forwarded flag
    const msgId = `msg_${Date.now()}`;
    await env.DB.prepare(`
        INSERT INTO messages (id, senderId, receiverId, text, media, mediaType, fileName, createdAt, read, readAt, reactions, replyTo, forwardedFrom) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, '[]', NULL, ?)
    `).bind(
        msgId,
        String(senderId),
        String(receiverId),
        original.text || null,
        original.media || null,
        original.mediaType || null,
        original.fileName || null,
        Date.now(),
        original.senderId // forwarded from original sender
    ).run();
    
    const newMessage = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(msgId).first();
    ctx.waitUntil(triggerPusher(env, `private-user-${receiverId}`, "chat-message", newMessage));
    
    return new Response(JSON.stringify(newMessage), { headers: corsHeaders });
}

/**
 * Get conversations list for a user
 */
export async function handleGetConversations(myId: string, env: Env): Promise<Response> {
    try {
        const { results: rawConvs } = await env.DB.prepare(`
            SELECT DISTINCT partner_id FROM (
                SELECT receiverId as partner_id FROM messages WHERE CAST(senderId AS TEXT) = ?
                UNION
                SELECT senderId as partner_id FROM messages WHERE CAST(receiverId AS TEXT) = ?
                UNION
                SELECT recipientId as partner_id FROM notifications WHERE CAST(senderId AS TEXT) = ?
                UNION
                SELECT senderId as partner_id FROM notifications WHERE CAST(recipientId AS TEXT) = ?
            ) WHERE partner_id IS NOT NULL AND partner_id != ''
        `).bind(myId, myId, myId, myId).all();

        const partnerPromises = (rawConvs || []).map(async (row: any) => {
            const pId = String(row.partner_id);
            if (pId === myId) return null;

            // Run these 3 queries in parallel for EACH partner
            const [user, lastMsg, unread] = await Promise.all([
                env.DB.prepare("SELECT full_name, profilePic FROM users WHERE CAST(id AS TEXT) = ?").bind(pId).first(),
                env.DB.prepare(`
                    SELECT text, createdAt FROM messages 
                    WHERE (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
                       OR (CAST(senderId AS TEXT) = ? AND CAST(receiverId AS TEXT) = ?)
                    ORDER BY createdAt DESC LIMIT 1
                `).bind(myId, pId, pId, myId).first(),
                env.DB.prepare(`
                    SELECT COUNT(*) as count FROM messages 
                    WHERE CAST(receiverId AS TEXT) = ? AND CAST(senderId AS TEXT) = ? AND read = 0
                `).bind(myId, pId).first()
            ]) as [any, any, any];

            return {
                userId: pId,
                userName: user?.full_name || "User " + pId.substr(0, 4),
                userPic: user?.profilePic || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png',
                lastMessage: lastMsg?.text || "CALL_LOG:VOICE:MISSED",
                lastMessageTime: lastMsg?.createdAt || Date.now(),
                unreadCount: unread?.count || 0
            };
        });

        const finalResults = (await Promise.all(partnerPromises)).filter(r => r !== null) as any[];
        finalResults.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        return new Response(JSON.stringify(finalResults), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    } catch (e: any) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
}

/**
 * Mark message as delivered
 */
export async function handleMarkMessageDelivered(request: Request, env: Env): Promise<Response> {
    const { messageId } = await request.json() as any;
    await env.DB.prepare(`UPDATE messages SET delivered = 1 WHERE id = ?`).bind(messageId).run();
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Mark message as seen by user
 */
export async function handleMarkMessageSeen(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { messageId, userId } = await request.json() as any;
    const message: any = await env.DB.prepare("SELECT seenBy, senderId FROM messages WHERE id = ?").bind(messageId).first();
    let seenBy = [];
    try { seenBy = JSON.parse(message?.seenBy || '[]'); } catch { seenBy = []; }
    if (!seenBy.includes(userId)) seenBy.push(userId);
    await env.DB.prepare(`UPDATE messages SET seen = 1, seenBy = ? WHERE id = ?`).bind(JSON.stringify(seenBy), messageId).run();
    
    const updatedMessage = await env.DB.prepare("SELECT * FROM messages WHERE id = ?").bind(messageId).first();
    ctx.waitUntil(triggerPusher(env, `private-user-${message.senderId}`, "message-seen", { messageId, seenBy }));
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
