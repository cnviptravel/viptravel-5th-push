// App Configuration and Mapbox Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { logApiUsage } from '../utils/apiUsageLogger';

/**
 * Get Mapbox access token
 */
export async function handleGetMapboxToken(env: Env): Promise<Response> {
    const token = env.MAPBOX_ACCESS_TOKEN || '';
    if (!token) {
        return new Response(JSON.stringify({ error: "MAPBOX_ACCESS_TOKEN not configured" }), { 
            status: 500, headers: corsHeaders 
        });
    }
    await logApiUsage(env, 'mapbox_load', 'token_request', null, 1);
    return new Response(JSON.stringify({ token }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } 
    });
}

/**
 * Get app configuration
 */
export async function handleGetConfig(env: Env): Promise<Response> {
    const config = await env.DB.prepare("SELECT * FROM AppConfig WHERE id = 1").first();
    return new Response(JSON.stringify(config || { appName: 'VIP Travel' }), { 
        headers: corsHeaders 
    });
}

/**
 * Update app configuration
 */
export async function handleUpdateConfig(request: Request, env: Env): Promise<Response> {
    const c = await request.json() as any;
    await env.DB.prepare(`
        INSERT INTO AppConfig (id, appName, logoUrl, loginLogoUrl, loginNameImageUrl, appNameImageUrl) 
        VALUES (1, ?, ?, ?, ?, ?) 
        ON CONFLICT(id) DO UPDATE SET 
            appName=excluded.appName, 
            logoUrl=excluded.logoUrl, 
            loginLogoUrl=excluded.loginLogoUrl, 
            loginNameImageUrl=excluded.loginNameImageUrl, 
            appNameImageUrl=excluded.appNameImageUrl
    `).bind(c.appName, c.logoUrl, c.loginLogoUrl, c.loginNameImageUrl, c.appNameImageUrl).run();
    
    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
}
