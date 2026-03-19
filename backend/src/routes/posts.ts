// Posts, Bookings, and Reviews Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { triggerPusher } from '../services/pusher';

/**
 * Create a new post
 */
export async function handleCreatePost(request: Request, env: Env): Promise<Response> {
    const body = await request.json() as any;
    
    // Check if user is pending (guide/provider must be approved)
    if (body.userId) {
        const poster: any = await env.DB.prepare(
            "SELECT status, role FROM users WHERE CAST(id AS TEXT) = ?"
        ).bind(String(body.userId)).first();
        
        if (poster && (poster.role === 'guide' || poster.role === 'provider') && poster.status !== 'approved') {
            return new Response(JSON.stringify({ 
                error: "Your account is pending approval. You cannot create posts yet." 
            }), { status: 403, headers: corsHeaders });
        }
    } else {
        // If no userId provided, try to get from request body or use default
        // This is for backward compatibility
        if (!body.userId && body._id) {
            body.userId = body._id;
        }
    }
    
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    await env.DB.prepare(`
        INSERT INTO posts (id, userId, userName, userPic, userRole, text, image, video, type, serviceTitle, price, capacity, created_at, likes, comments) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        postId, 
        body.userId, 
        body.userName, 
        body.userPic, 
        body.userRole, 
        body.text, 
        body.image || null, 
        body.video || null, 
        body.type || 'regular', 
        body.serviceTitle || null, 
        body.price || null, 
        body.capacity || null, 
        Date.now(), 
        '[]', 
        '[]'
    ).run();
    
    return new Response(JSON.stringify({ success: true, postId, _id: postId }), { headers: corsHeaders });
}

/**
 * Get all posts
 */
export async function handleGetPosts(env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.full_name AS live_userName, u.profilePic AS live_userPic 
        FROM posts p 
        LEFT JOIN users u ON CAST(p.userId AS TEXT) = CAST(u.id AS TEXT) 
        ORDER BY p.created_at DESC
    `).all();
    
    const posts = results.map((p: any) => {
        const liveUserName = p.live_userName || p.userName;
        const liveUserPic = p.live_userPic || p.userPic;
        let comments = JSON.parse(p.comments || '[]');
        return { 
            ...p, 
            _id: p.id, 
            createdAt: p.created_at, 
            userName: liveUserName, 
            userPic: liveUserPic, 
            likes: JSON.parse(p.likes || '[]'), 
            comments 
        };
    });
    
    return new Response(JSON.stringify(posts), { headers: corsHeaders });
}

/**
 * Delete a post
 */
export async function handleDeletePost(postId: string, env: Env): Promise<Response> {
    await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Add comment to a post
 */
export async function handleAddComment(postId: string, request: Request, env: Env): Promise<Response> {
    const { userId, userName, text } = await request.json() as any;
    const post: any = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first();
    
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), { 
            status: 404, headers: corsHeaders 
        });
    }
    
    // Always use live user name from DB
    const commenter: any = await env.DB.prepare(
        "SELECT full_name FROM users WHERE CAST(id AS TEXT) = ?"
    ).bind(String(userId)).first();
    
    const liveUserName = commenter?.full_name || userName;
    const comments = JSON.parse(post.comments || '[]');
    
    comments.push({ 
        id: `cmt_${Date.now()}`, 
        userId, 
        userName: liveUserName, 
        text, 
        createdAt: new Date().toISOString() 
    });
    
    await env.DB.prepare("UPDATE posts SET comments = ? WHERE id = ?")
        .bind(JSON.stringify(comments), postId).run();
    
    // Send notification to post owner (if commenter is not the owner)
    if (post.userId && String(post.userId) !== String(userId)) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await env.DB.prepare(`
            INSERT INTO notifications (id, recipientId, senderId, senderName, type, postId, read, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(notifId, String(post.userId), String(userId), userName, 'comment', postId, 0, Date.now()).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Get saved posts by IDs
 */
export async function handleGetSavedPosts(request: Request, env: Env): Promise<Response> {
    const { postIds } = await request.json() as any;
    if (!postIds || !postIds.length) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
    
    const placeholders = postIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.full_name AS live_userName, u.profilePic AS live_userPic 
        FROM posts p 
        LEFT JOIN users u ON CAST(p.userId AS TEXT) = CAST(u.id AS TEXT) 
        WHERE p.id IN (${placeholders}) 
        ORDER BY p.created_at DESC
    `).bind(...postIds).all();
    
    const posts = results.map((p: any) => ({ 
        ...p, 
        _id: p.id, 
        createdAt: p.created_at, 
        userName: p.live_userName || p.userName, 
        userPic: p.live_userPic || p.userPic, 
        likes: JSON.parse(p.likes || '[]'), 
        comments: JSON.parse(p.comments || '[]') 
    }));
    
    return new Response(JSON.stringify(posts), { headers: corsHeaders });
}

/**
 * Like/unlike a post
 */
export async function handleLikePost(postId: string, request: Request, env: Env): Promise<Response> {
    const { userId } = await request.json() as any;
    const post: any = await env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(postId).first();
    
    if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), { 
            status: 404, headers: corsHeaders 
        });
    }
    
    let likes = JSON.parse(post.likes || '[]');
    const wasLiked = likes.includes(userId);
    likes = wasLiked ? likes.filter((id: string) => id !== userId) : [...likes, userId];
    
    await env.DB.prepare("UPDATE posts SET likes = ? WHERE id = ?")
        .bind(JSON.stringify(likes), postId).run();
    
    // Send like notification (only when liking, not unliking, and not own post)
    if (!wasLiked && post.userId && String(post.userId) !== String(userId)) {
        const user: any = await env.DB.prepare(
            "SELECT full_name FROM users WHERE CAST(id AS TEXT) = ?"
        ).bind(String(userId)).first();
        
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await env.DB.prepare(`
            INSERT INTO notifications (id, recipientId, senderId, senderName, type, postId, read, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(notifId, String(post.userId), String(userId), user?.full_name || 'User', 'like', postId, 0, Date.now()).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}

/**
 * Save/unsave a post
 */
export async function handleSavePost(userId: string, request: Request, env: Env): Promise<Response> {
    const { postId } = await request.json() as any;
    const user: any = await env.DB.prepare("SELECT savedPostIds FROM users WHERE id = ?").bind(userId).first();
    let saved = JSON.parse(user.savedPostIds || '[]');
    
    if (saved.includes(postId)) {
        saved = saved.filter((id: string) => id !== postId);
    } else {
        saved.push(postId);
    }
    
    await env.DB.prepare("UPDATE users SET savedPostIds = ? WHERE id = ?")
        .bind(JSON.stringify(saved), userId).run();
    
    const updated = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
    return new Response(JSON.stringify(updated), { headers: corsHeaders });
}

/**
 * Create a booking
 */
export async function handleCreateBooking(request: Request, env: Env): Promise<Response> {
    const b = await request.json() as any;
    
    // Check if provider is approved before accepting bookings
    const providerUser: any = await env.DB.prepare(
        "SELECT status, role FROM users WHERE CAST(id AS TEXT) = ?"
    ).bind(String(b.providerId)).first();
    
    if (providerUser && (providerUser.role === 'guide' || providerUser.role === 'provider') && providerUser.status !== 'approved') {
        return new Response(JSON.stringify({ 
            error: "This provider is not yet approved to accept bookings." 
        }), { status: 403, headers: corsHeaders });
    }
    
    const id = `book_${Date.now()}`;
    await env.DB.prepare(`
        INSERT INTO bookings (id, providerId, providerName, customerId, serviceTitle, postId, date, guests, totalPrice, status, paymentMethod, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id, 
        b.providerId, 
        b.providerName, 
        b.customerId, 
        b.serviceTitle || null, 
        b.postId || null, 
        b.date, 
        b.guests, 
        b.totalPrice, 
        'confirmed', 
        b.paymentMethod, 
        Date.now()
    ).run();
    
    // Update bookingCount in the corresponding post if postId exists
    if (b.postId) {
        await env.DB.prepare("UPDATE posts SET bookingCount = IFNULL(bookingCount, 0) + 1 WHERE id = ?")
            .bind(b.postId).run();
    }

    return new Response(JSON.stringify({ success: true, id }), { headers: corsHeaders });
}

/**
 * Get bookings for a user
 */
export async function handleGetBookings(userId: string, env: Env): Promise<Response> {
    const { results } = await env.DB.prepare(
        "SELECT * FROM bookings WHERE customerId = ? OR providerId = ? ORDER BY createdAt DESC"
    ).bind(userId, userId).all();
    
    return new Response(JSON.stringify(results), { headers: corsHeaders });
}

/**
 * Add a review
 */
export async function handleAddReview(providerId: string, request: Request, env: Env): Promise<Response> {
    const r = await request.json() as any;
    await env.DB.prepare(`
        INSERT INTO reviews (id, providerId, reviewerId, reviewerName, reviewerPic, rating, comment, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        `rev_${Date.now()}`, 
        providerId, 
        r.reviewerId, 
        r.reviewerName, 
        r.reviewerPic, 
        r.rating, 
        r.comment || null, 
        Date.now()
    ).run();
    
    // Send review notification to the provider
    if (String(providerId) !== String(r.reviewerId)) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await env.DB.prepare(`
            INSERT INTO notifications (id, recipientId, senderId, senderName, type, read, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(notifId, String(providerId), String(r.reviewerId), r.reviewerName || 'User', 'review', 0, Date.now()).run();
    }
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
