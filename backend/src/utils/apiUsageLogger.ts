import { Env } from '../types/env';

export const API_COSTS: Record<string, { costPerUnit: number; unitType: string; description: string }> = {
  whisper:          { costPerUnit: 0.000006,   unitType: 'seconds',             description: 'Cloudflare Whisper — аудио транскрипц' },
  m2m100:           { costPerUnit: 0.000001,   unitType: 'requests',            description: 'Cloudflare M2M100 — текст орчуулга' },
  gemini_flash:     { costPerUnit: 0.00001875, unitType: 'tokens_1k',           description: 'Google Gemini Flash — аялалын төлөвлөгөө' },
  pusher_message:   { costPerUnit: 0.0000002,  unitType: 'messages',            description: 'Pusher — realtime мессеж/event' },
  brevo_email:      { costPerUnit: 0.00125,    unitType: 'emails',              description: 'Brevo — OTP/notification имэйл' },
  metered_turn:     { costPerUnit: 0.40,       unitType: 'gb',                  description: 'Metered.ca TURN — видео дуудлага relay' },
  cloudflare_calls: { costPerUnit: 0.00005,    unitType: 'participant_minutes', description: 'Cloudflare Calls SFU — WebRTC видео' },
  mapbox_load:      { costPerUnit: 0.0005,     unitType: 'map_loads',           description: 'Mapbox — газрын зураг ачаалал' },
  mapbox_geocoding: { costPerUnit: 0.0005,     unitType: 'requests',            description: 'Mapbox Geocoding — байршил хайлт' },
  r2_storage:       { costPerUnit: 0.015,      unitType: 'gb_month',            description: 'Cloudflare R2 — файл хадгалалт' },
  r2_upload:        { costPerUnit: 0.0000045,  unitType: 'operations',          description: 'Cloudflare R2 — файл upload' },
  r2_download:      { costPerUnit: 0.00000036, unitType: 'operations',          description: 'Cloudflare R2 — файл download' },
};

export async function logApiUsage(
  env: Env,
  apiName: string,
  action: string,
  userId: string | null,
  units: number = 1,
  customCost?: number
): Promise<void> {
  try {
    const cfg = API_COSTS[apiName];
    const cost = customCost ?? (cfg ? cfg.costPerUnit * units : 0);
    const unitType = cfg?.unitType ?? 'requests';
    await env.DB.prepare(
      `INSERT INTO api_usage_log (api_name, action, user_id, units, unit_type, estimated_cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(apiName, action, userId ?? 'system', units, unitType, cost, Date.now()).run();
  } catch (e) {
    console.error('[ApiUsageLogger] Failed:', e);
  }
}
