// File Upload and Image Serving Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';

/**
 * Upload a file to R2 bucket
 */
export async function handleUpload(request: Request, env: Env): Promise<Response> {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = `${Date.now()}-${file.name}`;
    
    await env.MY_BUCKET.put(fileName, file, { 
        httpMetadata: { contentType: file.type || "application/octet-stream" } 
    });
    
    return new Response(JSON.stringify({ success: true, filename: fileName }), { 
        headers: corsHeaders 
    });
}

/**
 * Serve an image from R2 bucket
 */
export async function handleGetImage(key: string, env: Env): Promise<Response> {
    const object = await env.MY_BUCKET.get(key);
    if (!object) {
        return new Response("Not found", { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Access-Control-Allow-Origin", "*");
    const ct = object.httpMetadata?.contentType || "application/octet-stream";
    headers.set("Content-Type", ct);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=31536000");
    
    return new Response(object.body, { headers });
}
