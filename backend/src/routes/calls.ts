// WebRTC Calls and TURN Credentials Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { triggerPusher } from '../services/pusher';
import { logApiUsage } from '../utils/apiUsageLogger';

/**
 * Get TURN credentials from Metered.ca
 */
export async function handleGetTurnCredentials(env: Env): Promise<Response> {
    try {
        const meteredRes = await fetch(
            `https://cnviptravel.metered.live/api/v1/turn/credentials?apiKey=${env.METERED_API_KEY}`
        );
        if (!meteredRes.ok) {
            return new Response(JSON.stringify({ error: "Failed to fetch TURN credentials" }), {
                status: 500, headers: corsHeaders
            });
        }
        const iceServers = await meteredRes.json();
        await logApiUsage(env, 'metered_turn', 'turn_credentials', null, 0);
        return new Response(JSON.stringify({ iceServers }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500, headers: corsHeaders
        });
    }
}

/**
 * Initiate a call
 */
export async function handleInitiateCall(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const { senderId, receiverId, type, senderName, senderPic } = await request.json() as any;

        // meetingId is only used for Pusher signaling
        const meetingId = crypto.randomUUID();
        const callId = `call_${Date.now()}`;
        
        const notification = { 
            id: callId, 
            recipientId: String(receiverId), 
            senderId: String(senderId), 
            senderName, 
            senderPic: senderPic || '',
            type: type === 'video' ? 'video_call' : 'voice_call', 
            meetingId,
            createdAt: Date.now() 
        };

        // Send real-time notification via Pusher
        ctx.waitUntil(triggerPusher(env, `private-user-${String(receiverId)}`, "incoming-call", notification));

        await logApiUsage(env, 'pusher_message', 'call_signal', String(senderId), 4);
        await logApiUsage(env, 'cloudflare_calls', 'video_call_start', String(senderId), 2);
        await logApiUsage(env, 'metered_turn', 'turn_relay', String(senderId), 0.015);

        return new Response(JSON.stringify({ success: true, meetingId }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Handle call accepted
 */
export async function handleCallAccepted(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const { callerId } = await request.json() as any;
        ctx.waitUntil(triggerPusher(env, `private-user-${String(callerId)}`, "call-accepted", { ts: Date.now() }));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Send track information
 */
export async function handleSendTracks(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const { receiverId, meetingId, senderSessionId, trackIds } = await request.json() as any;
        ctx.waitUntil(triggerPusher(env, `private-user-${String(receiverId)}`, "call-tracks", {
            meetingId,
            senderSessionId,
            trackIds
        }));
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * End a call
 */
export async function handleEndCall(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const { notifyUserId, callerId, receiverId, callType, duration, answered } = await request.json() as any;
        ctx.waitUntil(triggerPusher(env, `private-user-${String(notifyUserId)}`, "call-ended", { ts: Date.now() }));
        
        // Save call log as a chat message
        if (callerId && receiverId) {
            const msgId = `calllog_${Date.now()}`;
            let text: string;
            if (answered && duration > 0) {
                text = `CALL_LOG:${callType.toUpperCase()}:${duration}`;
            } else {
                text = `CALL_LOG:${callType.toUpperCase()}:MISSED`;
            }
            await env.DB.prepare(
                `INSERT INTO messages (id, senderId, receiverId, text, media, mediaType, fileName, createdAt, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
            ).bind(msgId, String(callerId), String(receiverId), text, null, 'call_log', null, Date.now()).run();
        }
        
        return new Response(JSON.stringify({ success: true }), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}

/**
 * Proxy Cloudflare Calls API requests
 */
export async function handleCloudflareCallsProxy(
    request: Request, 
    env: Env, 
    pathParts: string[]
): Promise<Response> {
    try {
        let targetUrl: string;
        const baseUrl = `https://rtc.live.cloudflare.com/v1/apps/${env.CLOUDFLARE_APP_ID}`;

        if (pathParts[2] === "sessions" && pathParts[3] === "new") {
            targetUrl = `${baseUrl}/sessions/new`;
        } else if (pathParts[3] === "tracks" && pathParts[4] === "new") {
            targetUrl = `${baseUrl}/sessions/${pathParts[2]}/tracks/new`;
        } else if (pathParts[3] === "renegotiate") {
            targetUrl = `${baseUrl}/sessions/${pathParts[2]}/renegotiate`;
        } else {
            return new Response(JSON.stringify({ error: "Invalid endpoint" }), { 
                status: 400, headers: corsHeaders 
            });
        }

        // Read body as text to avoid parse errors
        const bodyText = await request.text();
        const body = bodyText ? JSON.parse(bodyText) : {};

        const cfRes = await fetch(targetUrl, {
            method: pathParts[3] === "renegotiate" ? 'PUT' : 'POST',
            headers: { 
                'Authorization': `Bearer ${env.CLOUDFLARE_APP_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const resData = await cfRes.json();
        return new Response(JSON.stringify(resData), { 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
