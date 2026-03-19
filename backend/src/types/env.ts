// Environment interface for Cloudflare Workers
import type { Ai } from '@cloudflare/workers-types';

export interface Env {
    MY_BUCKET: R2Bucket;
    DB: D1Database;
    AI: Ai;                      // Cloudflare Workers AI binding
    GEMINI_API_KEY: string;
    PUSHER_APP_ID: string;
    PUSHER_KEY: string;
    PUSHER_SECRET: string;
    PUSHER_CLUSTER: string;
    CLOUDFLARE_APP_ID: string;    // Serverless SFU App ID
    CLOUDFLARE_APP_SECRET: string; // Serverless SFU App Token
    TELEGRAM_TOKEN: string;
    BREVO_API_KEY: string;        // Brevo (SendinBlue) API Key
    MAPBOX_ACCESS_TOKEN: string;  // Mapbox public access token
    GOOGLE_TRANSLATE_KEY: string;
    OPENAI_API_KEY: string;       // OpenAI API Key for Whisper and GPT
    METERED_API_KEY: string;      // Metered.ca TURN server API key
}
