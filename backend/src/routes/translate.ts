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

// Helper: текстийн hash үүсгэх
async function makeHash(text: string, src: string, tgt: string): Promise<string> {
    const key = `${text.toLowerCase().trim()}|${src}|${tgt}`;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Helper: хэлний нэр
const LANG_NAMES: Record<string, string> = {
    en:'English', mn:'Mongolian', zh:'Chinese', ru:'Russian',
    ja:'Japanese', ko:'Korean', de:'German', fr:'French',
    es:'Spanish', it:'Italian', ar:'Arabic', hi:'Hindi',
    tr:'Turkish', pt:'Portuguese', th:'Thai', vi:'Vietnamese',
    uk:'Ukrainian', pl:'Polish', nl:'Dutch', sv:'Swedish',
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
 * Handle audio translation using OpenAI Whisper + GPT-4o-mini + Llama fallback + Cache
 */
export async function handleTranslateAudio(request: Request, env: Env): Promise<Response> {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;
        const targetLang = formData.get('targetLang') as string || 'en';
        const sourceLang = formData.get('sourceLang') as string || 'mn';

        if (!audioFile) {
            return new Response(JSON.stringify({ error: 'No audio file' }), {
                status: 400, headers: corsHeaders
            });
        }

        const audioBuffer = await audioFile.arrayBuffer();

        // ── 1. Speech-to-Text: OpenAI Whisper (монгол сайн таньдаг) ──
        let originalText = '';
        if (env.OPENAI_API_KEY) {
            try {
                const fd = new FormData();
                const ext = (audioFile.type || '').includes('mp4') ? 'mp4' : 'webm';
                fd.append('file', new Blob([audioBuffer], { type: audioFile.type || 'audio/webm' }), `audio.${ext}`);
                fd.append('model', 'whisper-1');
                if (sourceLang && sourceLang !== 'auto') fd.append('language', sourceLang);

                const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
                    body: fd,
                });
                if (res.ok) {
                    originalText = ((await res.json()) as any).text || '';
                    console.log(`[Whisper-OAI] ${sourceLang}: "${originalText.substring(0, 80)}"`);
                } else {
                    throw new Error(`OpenAI ${res.status}`);
                }
            } catch (e: any) {
                console.warn('[Whisper-OAI] Falling back to CF Whisper:', e.message);
                const inp: any = { audio: [...new Uint8Array(audioBuffer)] };
                if (sourceLang !== 'auto') inp.language = sourceLang;
                originalText = ((await env.AI.run('@cf/openai/whisper', inp)) as any).text || '';
            }
        } else {
            const inp: any = { audio: [...new Uint8Array(audioBuffer)] };
            if (sourceLang !== 'auto') inp.language = sourceLang;
            originalText = ((await env.AI.run('@cf/openai/whisper', inp)) as any).text || '';
        }

        if (!originalText.trim()) {
            return new Response(JSON.stringify({ original: '', translated: '' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ── 2. D1 кэш шалгах ──
        const hash = await makeHash(originalText, sourceLang, targetLang);
        const cached = await env.DB.prepare(
            `SELECT translated_text FROM translations WHERE text_hash=? AND source_lang=? AND target_lang=? LIMIT 1`
        ).bind(hash, sourceLang, targetLang).first() as any;

        if (cached?.translated_text) {
            console.log(`[Cache HIT] "${originalText.substring(0, 40)}"`);
            // usage_count нэмэгдүүлэх
            await env.DB.prepare(
                `UPDATE translations SET usage_count = usage_count + 1 WHERE text_hash=? AND source_lang=? AND target_lang=?`
            ).bind(hash, sourceLang, targetLang).run();
            await logApiUsage(env, 'whisper', 'translate_audio', null, audioBuffer.byteLength / 32000);
            return new Response(JSON.stringify({
                original: originalText,
                translated: cached.translated_text,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // ── 3. Орчуулга: GPT-4o-mini → Llama fallback ──
        const srcName = LANG_NAMES[sourceLang] || sourceLang;
        const tgtName = LANG_NAMES[targetLang] || targetLang;
        let translatedText = originalText;
        let engine = 'llama';

        // GPT-4o-mini
        let gptOk = false;
        if (env.OPENAI_API_KEY) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: `You are a translator. Translate from ${srcName} to ${tgtName}. Return ONLY the translated text, nothing else. No explanations, no quotes.` },
                            { role: 'user', content: originalText }
                        ],
                        max_tokens: 500,
                        temperature: 0.3,
                    }),
                });
                if (res.ok) {
                    translatedText = ((await res.json()) as any).choices?.[0]?.message?.content?.trim() || originalText;
                    engine = 'gpt-4o-mini';
                    gptOk = true;
                    console.log(`[GPT-4o-mini] "${translatedText.substring(0, 80)}"`);
                } else {
                    const err = await res.text();
                    console.warn(`[GPT-4o-mini] ${res.status}: ${err.substring(0, 100)}`);
                    // 429 = rate limit, 402 = billing — Llama руу шилжнэ
                }
            } catch (e: any) {
                console.warn('[GPT-4o-mini] Error:', e.message);
            }
        }

        // Llama fallback (GPT амжилтгүй болсон үед)
        if (!gptOk) {
            try {
                const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
                    messages: [
                        { role: 'system', content: `You are a translator. Translate from ${srcName} to ${tgtName}. Return ONLY the translated text, nothing else.` },
                        { role: 'user', content: originalText }
                    ],
                    max_tokens: 500,
                } as any);
                const llamaText = (result as any).response?.trim() || '';
                if (llamaText) {
                    translatedText = llamaText;
                    engine = 'llama';
                    console.log(`[Llama] "${translatedText.substring(0, 80)}"`);
                }
            } catch (e: any) {
                console.error('[Llama] Error:', e.message);
                // M2M100 last resort
                try {
                    const src2 = m2mLangMap[sourceLang] || sourceLang;
                    const tgt2 = m2mLangMap[targetLang] || targetLang;
                    const r = await env.AI.run('@cf/meta/m2m100-1.2b', { text: originalText, source_lang: src2, target_lang: tgt2 });
                    translatedText = (r as any).translated_text || originalText;
                    engine = 'm2m100';
                } catch { /* use original */ }
            }
        }

        // ── 4. D1-д хадгалах ──
        try {
            await env.DB.prepare(
                `INSERT OR IGNORE INTO translations (text_hash, original_text, translated_text, source_lang, target_lang, engine, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
            ).bind(hash, originalText, translatedText, sourceLang, targetLang, engine, Date.now()).run();
        } catch (e) {
            console.error('[DB] Save translation failed:', e);
        }

        // ── 5. API usage log ──
        // Whisper (аудио транскрипц) тусдаа бүртгэх
        await logApiUsage(env, 'whisper', 'translate_audio', null, audioBuffer.byteLength / 32000);
        // Орчуулгад ашигласан engine-г зөв бүртгэх
        await logApiUsage(env, engine, 'translate_audio_translation', null, 1);

        return new Response(JSON.stringify({
            original: originalText,
            translated: translatedText,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (e: any) {
        console.error('[TranslateAudio] Error:', e);
        return new Response(JSON.stringify({ error: 'Audio translation failed', details: e.message }), {
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

        // Step 1: Transcribe audio using OpenAI Whisper or Cloudflare Whisper
        const audioBuffer = await audioFile.arrayBuffer();
        let transcribedText = "";
        
        if (env.OPENAI_API_KEY) {
            try {
                const fd = new FormData();
                const ext = (audioFile.type || '').includes('mp4') ? 'mp4' : 'webm';
                fd.append('file', new Blob([audioBuffer], { type: audioFile.type || 'audio/webm' }), `audio.${ext}`);
                fd.append('model', 'whisper-1');
                if (sourceLang && sourceLang !== 'auto') fd.append('language', sourceLang);
                const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
                    body: fd,
                });
                if (res.ok) {
                    transcribedText = ((await res.json()) as any).text || '';
                } else {
                    throw new Error(`${res.status}`);
                }
            } catch {
                const inp: any = { audio: [...new Uint8Array(audioBuffer)] };
                if (sourceLang !== 'auto') inp.language = sourceLang;
                transcribedText = ((await env.AI.run('@cf/openai/whisper', inp)) as any).text || '';
            }
        } else {
            const inp: any = { audio: [...new Uint8Array(audioBuffer)] };
            if (sourceLang !== 'auto') inp.language = sourceLang;
            transcribedText = ((await env.AI.run('@cf/openai/whisper', inp)) as any).text || '';
        }
        
        console.log(`[Transcribe] Whisper result: ${transcribedText.substring(0, 100)}...`);

        if (!transcribedText.trim()) {
            return new Response(JSON.stringify({ 
                success: true,
                transcribed: "",
                translated: "",
                language: targetLang
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Step 2: D1 кэш шалгах
        const hash2 = await makeHash(transcribedText, sourceLang, targetLang);
        const cached2 = await env.DB.prepare(
            `SELECT translated_text FROM translations WHERE text_hash=? AND source_lang=? AND target_lang=? LIMIT 1`
        ).bind(hash2, sourceLang, targetLang).first() as any;

        let translatedText = transcribedText;
        
        if (cached2?.translated_text) {
            translatedText = cached2.translated_text;
            // usage_count нэмэгдүүлэх
            await env.DB.prepare(
                `UPDATE translations SET usage_count = usage_count + 1 WHERE text_hash=? AND source_lang=? AND target_lang=?`
            ).bind(hash2, sourceLang, targetLang).run();
        } else {
            const srcN = LANG_NAMES[sourceLang] || sourceLang;
            const tgtN = LANG_NAMES[targetLang] || targetLang;
            let eng2 = 'llama';
            let ok2 = false;
            
            // GPT-4o-mini
            if (env.OPENAI_API_KEY) {
                try {
                    const r = await fetch('https://api.openai.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: `Translate from ${srcN} to ${tgtN}. Return ONLY the translation.` },
                                { role: 'user', content: transcribedText }
                            ],
                            max_tokens: 500, temperature: 0.3,
                        }),
                    });
                    if (r.ok) {
                        translatedText = ((await r.json()) as any).choices?.[0]?.message?.content?.trim() || transcribedText;
                        eng2 = 'gpt-4o-mini'; ok2 = true;
                    }
                } catch { /* fallback */ }
            }
            
            // Llama fallback
            if (!ok2) {
                try {
                    const r2 = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
                        messages: [
                            { role: 'system', content: `Translate from ${srcN} to ${tgtN}. Return ONLY the translation.` },
                            { role: 'user', content: transcribedText }
                        ], max_tokens: 500,
                    } as any);
                    translatedText = (r2 as any).response?.trim() || transcribedText;
                } catch { /* use original */ }
            }
            
            // D1-д хадгалах
            try {
                await env.DB.prepare(
                    `INSERT OR IGNORE INTO translations (text_hash,original_text,translated_text,source_lang,target_lang,engine,created_at) VALUES (?,?,?,?,?,?,?)`
                ).bind(hash2, transcribedText, translatedText, sourceLang, targetLang, eng2, Date.now()).run();
            } catch { /* ignore */ }
        }
        
        console.log(`[Transcribe] Translated: ${translatedText.substring(0, 100)}...`);

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

/**
 * Text-to-text translation with cache + GPT-4o-mini + Llama fallback
 */
export async function handleTranslateText(request: Request, env: Env): Promise<Response> {
    try {
        const { text, sourceLang, targetLang } = await request.json() as any;

        if (!text?.trim()) {
            return new Response(JSON.stringify({ translated: '' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log(`[TranslateText] Request: "${text.substring(0, 50)}..." from ${sourceLang} to ${targetLang}`);

        // 1. D1 кэш шалгах
        const hash = await makeHash(text, sourceLang, targetLang);
        console.log(`[TranslateText] Hash: ${hash}`);
        
        const cached = await env.DB.prepare(
            `SELECT translated_text, engine, usage_count FROM translations WHERE text_hash=? AND source_lang=? AND target_lang=? LIMIT 1`
        ).bind(hash, sourceLang, targetLang).first() as any;

        if (cached?.translated_text) {
            console.log(`[Cache HIT] "${text.substring(0, 40)}..."`);
            console.log(`[Cache HIT] Engine: ${cached.engine}, Usage count: ${cached.usage_count}`);
            
            // usage_count нэмэгдүүлэх
            await env.DB.prepare(
                `UPDATE translations SET usage_count = usage_count + 1 WHERE text_hash=? AND source_lang=? AND target_lang=?`
            ).bind(hash, sourceLang, targetLang).run();
            
            console.log(`[Cache HIT] Updated usage_count`);
            return new Response(JSON.stringify({ 
                translated: cached.translated_text, 
                cached: true,
                engine: cached.engine,
                usage_count: cached.usage_count + 1
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        console.log(`[Cache MISS] "${text.substring(0, 40)}..."`);

        const srcName = LANG_NAMES[sourceLang] || sourceLang;
        const tgtName = LANG_NAMES[targetLang] || targetLang;
        let translated = text;
        let engine = 'llama';

        // 2. GPT-4o-mini
        let gptOk = false;
        if (env.OPENAI_API_KEY) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: `Translate from ${srcName} to ${tgtName}. Return ONLY the translated text.` },
                            { role: 'user', content: text }
                        ],
                        max_tokens: 500, temperature: 0.3,
                    }),
                });
                if (res.ok) {
                    translated = ((await res.json()) as any).choices?.[0]?.message?.content?.trim() || text;
                    engine = 'gpt-4o-mini';
                    gptOk = true;
                }
            } catch { /* fallback */ }
        }

        // 3. Llama fallback
        if (!gptOk) {
            try {
                const r = await env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
                    messages: [
                        { role: 'system', content: `Translate from ${srcName} to ${tgtName}. Return ONLY the translation.` },
                        { role: 'user', content: text }
                    ], max_tokens: 500,
                } as any);
                translated = (r as any).response?.trim() || text;
                engine = 'llama';
            } catch (e: any) {
                console.error('[Llama] Error:', e.message);
                // M2M100 last resort
                try {
                    const src2 = m2mLangMap[sourceLang] || sourceLang;
                    const tgt2 = m2mLangMap[targetLang] || targetLang;
                    const r2 = await env.AI.run('@cf/meta/m2m100-1.2b', { text, source_lang: src2, target_lang: tgt2 });
                    translated = (r2 as any).translated_text || text;
                    engine = 'm2m100';
                } catch { /* use original */ }
            }
        }

        // 4. D1-д хадгалах
        try {
            await env.DB.prepare(
                `INSERT OR IGNORE INTO translations (text_hash,original_text,translated_text,source_lang,target_lang,engine,created_at) VALUES (?,?,?,?,?,?,?)`
            ).bind(hash, text, translated, sourceLang, targetLang, engine, Date.now()).run();
        } catch (e) { console.error('[DB] Save failed:', e); }

        await logApiUsage(env, engine, 'translate_text', null, 1);

        return new Response(JSON.stringify({ translated }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
}
