// AI Translation and Transcription Routes

import { Env } from '../types/env';
import { corsHeaders } from '../config/cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { triggerPusher } from '../services/pusher';
import { logApiUsage } from '../utils/apiUsageLogger';

// M2M100 хэлний код mapping
const m2mLangMap: Record<string, string> = {
    'en': 'en', 'mn': 'mn', 'zh': 'zh', 'ru': 'ru',
    'ja': 'ja', 'ko': 'ko', 'de': 'de', 'fr': 'fr',
    'es': 'es', 'it': 'it', 'ar': 'ar', 'hi': 'hi',
    'tr': 'tr', 'pt': 'pt', 'th': 'th', 'vi': 'vi',
    'af': 'af', 'sq': 'sq', 'am': 'am', 'hy': 'hy',
    'az': 'az', 'bn': 'bn', 'bg': 'bg', 'ca': 'ca',
    'hr': 'hr', 'cs': 'cs', 'da': 'da', 'nl': 'nl',
    'et': 'et', 'fi': 'fi', 'ka': 'ka', 'el': 'el',
    'hu': 'hu', 'id': 'id', 'kk': 'kk', 'lv': 'lv',
    'lt': 'lt', 'mk': 'mk', 'ms': 'ms', 'mt': 'mt',
    'ne': 'ne', 'no': 'no', 'fa': 'fa', 'pl': 'pl',
    'ro': 'ro', 'sr': 'sr', 'sk': 'sk', 'sl': 'sl',
    'sw': 'sw', 'sv': 'sv', 'tg': 'tg', 'ta': 'ta',
    'te': 'te', 'uk': 'uk', 'ur': 'ur', 'uz': 'uz',
    'cy': 'cy', 'zu': 'zu',
};

/**
 * Handle text translation using Cloudflare M2M100
 */
export async function handleTranslate(request: Request, env: Env): Promise<Response> {
    try {
        console.log('[Translate] Starting text translation...');
        
        // Check content type
        const contentType = request.headers.get('content-type') || '';
        console.log(`[Translate] Content-Type: ${contentType}`);
        
        // Read request body
        const requestText = await request.text();
        console.log(`[Translate] Request body: ${requestText.substring(0, 200)}...`);
        
        let text, sourceLang, targetLang;
        try {
            const data = JSON.parse(requestText);
            text = data.text;
            sourceLang = data.sourceLang;
            targetLang = data.targetLang;
            console.log(`[Translate] Parsed: text="${text?.substring(0, 50)}...", sourceLang=${sourceLang}, targetLang=${targetLang}`);
        } catch (parseError: any) {
            console.error('[Translate] JSON parse error:', parseError);
            return new Response(JSON.stringify({ 
                error: 'Invalid JSON format', 
                details: parseError.message,
                received: requestText.substring(0, 100)
            }), {
                status: 400, headers: corsHeaders
            });
        }

        if (!text?.trim()) {
            console.log('[Translate] Empty text provided');
            return new Response(JSON.stringify({ translatedText: "" }), { 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            });
        }

        const src = m2mLangMap[sourceLang] || sourceLang;
        const tgt = m2mLangMap[targetLang] || targetLang;

        console.log(`[Translate] M2M100: "${text.substring(0, 50)}..." from ${src} to ${tgt}`);

        // Check if AI binding is available
        if (!env.AI) {
            console.error('[Translate] AI binding is not available');
            return new Response(JSON.stringify({ 
                error: 'AI service not configured',
                translatedText: text // Fallback: return original text
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        try {
            const response = await env.AI.run('@cf/meta/m2m100-1.2b', {
                text: text,
                source_lang: src,
                target_lang: tgt,
            });

            const translatedText = (response as any).translated_text || '';

            console.log(`[Translate] Result: "${translatedText.substring(0, 50)}..."`);

            // Log API usage
            await logApiUsage(env, 'm2m100', 'translate_text', null, 1);

            return new Response(JSON.stringify({ translatedText }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        } catch (aiError: any) {
            console.error('[Translate] AI API error:', aiError);
            return new Response(JSON.stringify({ 
                error: 'AI translation failed',
                details: aiError.message,
                translatedText: text // Fallback: return original text
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (e: any) {
        console.error('[Translate] General error:', e);
        return new Response(JSON.stringify({ 
            error: 'Translation failed', 
            details: e.message,
            stack: e.stack 
        }), {
            status: 500, headers: corsHeaders
        });
    }
}

/**
 * Handle audio translation using Cloudflare Whisper + M2M100
 */
export async function handleTranslateAudio(request: Request, env: Env): Promise<Response> {
    try {
        console.log('[TranslateAudio] Starting audio translation...');
        
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const targetLang = formData.get('targetLang') as string || 'en';
        const sourceLang = formData.get('sourceLang') as string || 'mn';

        console.log(`[TranslateAudio] Params: targetLang=${targetLang}, sourceLang=${sourceLang}`);

        if (!audioFile) {
            console.error('[TranslateAudio] No audio file provided');
            return new Response(JSON.stringify({ error: 'No audio file' }), {
                status: 400, headers: corsHeaders
            });
        }

        console.log(`[TranslateAudio] File: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

        // Check if AI binding is available
        if (!env.AI) {
            console.error('[TranslateAudio] AI binding is not available');
            return new Response(JSON.stringify({ 
                error: 'AI service not configured',
                original: '',
                translated: ''
            }), {
                status: 503,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Step 1: Whisper — аудио → текст
        console.log('[TranslateAudio] Step 1: Converting audio to text with Whisper...');
        const audioBuffer = await audioFile.arrayBuffer();
        console.log(`[TranslateAudio] Audio buffer size: ${audioBuffer.byteLength} bytes`);
        
        try {
            const whisperInput: any = {
                audio: [...new Uint8Array(audioBuffer)],
            };
            // sourceLang өгснөөр Whisper тэр хэлд тохируулж транскрипц хийнэ
            // mn → монгол текст, en → англи текст, zh → хятад текст
            if (sourceLang && sourceLang !== 'auto') {
                whisperInput.language = sourceLang;
            }
            const whisperResult = await env.AI.run('@cf/openai/whisper-large-v3-turbo', whisperInput);
            console.log('[TranslateAudio] Whisper API call successful');

            const originalText = (whisperResult as any).text || '';
            console.log(`[Whisper] Transcribed: "${originalText.substring(0, 100)}..."`);

            const audioSeconds = audioBuffer.byteLength / 32000;
            await logApiUsage(env, 'whisper', 'translate_audio', null, audioSeconds);

            if (!originalText.trim()) {
                console.log('[TranslateAudio] No text transcribed from audio');
                return new Response(JSON.stringify({ original: '', translated: '' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Step 2: M2M100 — текст → орчуулга
            const src = m2mLangMap[sourceLang] || sourceLang;
            const tgt = m2mLangMap[targetLang] || targetLang;

            console.log(`[M2M100] Translating from ${src} to ${tgt}, text length: ${originalText.length}`);

            try {
                const translateResult = await env.AI.run('@cf/meta/m2m100-1.2b', {
                    text: originalText,
                    source_lang: src,
                    target_lang: tgt,
                });
                console.log('[TranslateAudio] M2M100 API call successful');

                const translatedText = (translateResult as any).translated_text || originalText;

                console.log(`[M2M100] Result: "${translatedText.substring(0, 100)}..."`);

                await logApiUsage(env, 'm2m100', 'translate_audio', null, 1);

                return new Response(JSON.stringify({
                    original: originalText,
                    translated: translatedText
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (m2mError: any) {
                console.error('[TranslateAudio] M2M100 translation error:', m2mError);
                return new Response(JSON.stringify({ 
                    error: 'M2M100 translation failed', 
                    details: m2mError.message 
                }), {
                    status: 500, headers: corsHeaders
                });
            }

        } catch (whisperError: any) {
            console.error('[TranslateAudio] Whisper transcription error:', whisperError);
            return new Response(JSON.stringify({ 
                error: 'Whisper transcription failed', 
                details: whisperError.message 
            }), {
                status: 500, headers: corsHeaders
            });
        }

    } catch (e: any) {
        console.error('[TranslateAudio] General error:', e);
        return new Response(JSON.stringify({ 
            error: 'Audio translation failed', 
            details: e.message,
            stack: e.stack 
        }), {
            status: 500, headers: corsHeaders
        });
    }
}

/**
 * Handle AI travel plan generation
 */
export async function handleAiPlan(request: Request, env: Env): Promise<Response> {
    const { destination, duration, budget, language } = await request.json() as any;
    
    if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: "Gemini API key not configured" }), { 
            status: 500, headers: corsHeaders 
        });
    }

    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `Act as a professional travel planner. Plan a ${duration}-day trip to ${destination}. 
    Budget level: ${budget}. 
    Provide a detailed day-by-day itinerary including places to visit, things to do, and estimated costs.
    Response MUST be in ${language} language.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const plan = response.text();

    const inputTokens = prompt.length / 4 / 1000;
    const outputTokens = plan.length / 4 / 1000;
    await logApiUsage(env, 'gemini_flash', 'ai_plan', null, inputTokens + outputTokens);

    return new Response(JSON.stringify({ plan }), { headers: corsHeaders });
}

/**
 * Handle audio transcription and translation (for live streaming)
 */
export async function handleTranscribe(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
        const formData = await request.formData();
        const audioFile = formData.get("audio") as File;
        const targetLang = formData.get("targetLang") as string || "en";
        const sourceLang = formData.get("sourceLang") as string || "en";
        const channel = formData.get("channel") as string;
        const userId = formData.get("userId") as string;

        if (!audioFile) {
            return new Response(JSON.stringify({ error: "Audio file is required" }), { 
                status: 400, headers: corsHeaders 
            });
        }

        console.log(`[Transcribe] Processing audio: ${audioFile.name}, size: ${audioFile.size}, type: ${audioFile.type}`);

        // Step 1: Transcribe audio using Cloudflare AI Whisper
        const audioBuffer = await audioFile.arrayBuffer();
        let transcribedText = "";
        
        try {
            const whisperInput: any = {
                audio: [...new Uint8Array(audioBuffer)],
            };
            if (sourceLang && sourceLang !== 'auto') {
                whisperInput.language = sourceLang;
            }
            const whisperResult = await env.AI.run('@cf/openai/whisper-large-v3-turbo', whisperInput);
            transcribedText = (whisperResult as any).text || "";
            console.log(`[Transcribe] Whisper result: ${transcribedText.substring(0, 100)}...`);
        } catch (whisperError: any) {
            console.error("[Transcribe] Whisper error:", whisperError);
            return new Response(JSON.stringify({ 
                error: "Transcription failed", 
                details: whisperError.message 
            }), { status: 500, headers: corsHeaders });
        }

        if (!transcribedText.trim()) {
            return new Response(JSON.stringify({ 
                success: true,
                transcribed: "",
                translated: "",
                language: targetLang
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Step 2: Translate using M2M100
        let translatedText = transcribedText;
        
        try {
            const src = m2mLangMap[sourceLang] || sourceLang;
            const tgt = m2mLangMap[targetLang] || targetLang;
            const translateResult = await env.AI.run('@cf/meta/m2m100-1.2b', {
                text: transcribedText,
                source_lang: src,
                target_lang: tgt,
            });
            translatedText = (translateResult as any).translated_text || transcribedText;
            console.log(`[Transcribe] M2M100 translated: ${translatedText.substring(0, 100)}...`);
        } catch (translateError: any) {
            console.warn("[Transcribe] M2M100 translation failed, using original:", translateError);
        }

        // Step 3: Send to Pusher if channel and userId provided
        if (channel && userId) {
            const subtitleData = {
                original: transcribedText,
                translated: translatedText,
                timestamp: Date.now(),
                userId: userId,
                language: targetLang
            };

            ctx.waitUntil(triggerPusher(env, channel, "subtitle-update", subtitleData));
        }

        return new Response(JSON.stringify({
            success: true,
            transcribed: transcribedText,
            translated: translatedText,
            language: targetLang
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (e: any) {
        console.error("[Transcribe] Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
