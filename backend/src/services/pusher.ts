// Pusher Real-time Notification Service

import { Env } from '../types/env';

/**
 * Trigger Pusher event
 */
export async function triggerPusher(
    env: Env, 
    channel: string, 
    event: string, 
    data: any
): Promise<Response> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
        name: event,
        channels: [channel],
        data: JSON.stringify(data)
    });

    const msgUint8 = new TextEncoder().encode(body);
    const hashBuffer = await crypto.subtle.digest("MD5", msgUint8);
    const bodyMd5 = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    const queryString = `auth_key=${env.PUSHER_KEY}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
    const stringToSign = `POST\n/apps/${env.PUSHER_APP_ID}/events\n${queryString}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", 
        encoder.encode(env.PUSHER_SECRET), 
        { name: "HMAC", hash: "SHA-256" }, 
        false, 
        ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(stringToSign));
    const signature = Array.from(new Uint8Array(sigBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    const url = `https://api-${env.PUSHER_CLUSTER}.pusher.com/apps/${env.PUSHER_APP_ID}/events?${queryString}&auth_signature=${signature}`;

    return fetch(url, {
        method: "POST",
        body: body,
        headers: { "Content-Type": "application/json" }
    });
}
