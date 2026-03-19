import { Env } from '../types/env';

export const API_COSTS: Record<string, {
  costPerUnit: number; unitType: string; description: string;
  freeTierDaily?: number; freeTierMonthly?: number;
  freeTierPeriod: 'daily' | 'monthly';
}> = {
  whisper:          { costPerUnit: 0.000011,     unitType: 'seconds',             description: 'Cloudflare Whisper — аудио транскрипц',      freeTierDaily: 100,        freeTierPeriod: 'daily'   },
  m2m100:           { costPerUnit: 0.000011,     unitType: 'requests',            description: 'Cloudflare M2M100 — текст орчуулга',          freeTierDaily: 100,        freeTierPeriod: 'daily'   },
  'gpt-4o-mini':    { costPerUnit: 0.00000015,   unitType: 'requests',            description: 'OpenAI GPT-4o-mini — текст орчуулга',         freeTierMonthly: 0,        freeTierPeriod: 'monthly' },
  llama:            { costPerUnit: 0.000011,     unitType: 'requests',            description: 'Cloudflare Llama — fallback орчуулга',        freeTierDaily: 100,        freeTierPeriod: 'daily'   },
  gemini_flash:     { costPerUnit: 0.0000000375, unitType: 'tokens',              description: 'Google Gemini Flash — аялалын төлөвлөгөө',    freeTierDaily: 1500,       freeTierPeriod: 'daily'   },
  pusher_message:   { costPerUnit: 0.000000245,  unitType: 'messages',            description: 'Pusher — realtime мессеж/event',              freeTierDaily: 200000,     freeTierPeriod: 'daily'   },
  brevo_email:      { costPerUnit: 0.00125,      unitType: 'emails',              description: 'Brevo — OTP/notification имэйл',              freeTierDaily: 300,        freeTierPeriod: 'daily'   },
  metered_turn:     { costPerUnit: 0.40,         unitType: 'gb',                  description: 'Metered.ca TURN — видео дуудлага relay',       freeTierMonthly: 50,       freeTierPeriod: 'monthly' },
  cloudflare_calls: { costPerUnit: 0.00005,      unitType: 'participant_minutes', description: 'Cloudflare Calls SFU — WebRTC видео',          freeTierMonthly: 1000,     freeTierPeriod: 'monthly' },
  mapbox_load:      { costPerUnit: 0.0005,       unitType: 'map_loads',           description: 'Mapbox — газрын зураг ачаалал',               freeTierMonthly: 50000,    freeTierPeriod: 'monthly' },
  mapbox_geocoding: { costPerUnit: 0.0005,       unitType: 'requests',            description: 'Mapbox Geocoding — байршил хайлт',            freeTierMonthly: 100000,   freeTierPeriod: 'monthly' },
  r2_storage:       { costPerUnit: 0.015,        unitType: 'gb_month',            description: 'Cloudflare R2 — файл хадгалалт',              freeTierMonthly: 10,       freeTierPeriod: 'monthly' },
  r2_upload:        { costPerUnit: 0.0000045,    unitType: 'operations',          description: 'Cloudflare R2 — файл upload',                 freeTierMonthly: 1000000,  freeTierPeriod: 'monthly' },
  r2_download:      { costPerUnit: 0.00000036,   unitType: 'operations',          description: 'Cloudflare R2 — файл download',               freeTierMonthly: 10000000, freeTierPeriod: 'monthly' },
};

function calcCost(cfg: typeof API_COSTS[string], currentTotal: number, newUnits: number): number {
  const freeTier = cfg.freeTierDaily ?? cfg.freeTierMonthly ?? 0;
  if (freeTier === 0) return cfg.costPerUnit * newUnits;
  if (currentTotal >= freeTier) return cfg.costPerUnit * newUnits;
  const remaining = freeTier - currentTotal;
  if (newUnits <= remaining) return 0;
  return cfg.costPerUnit * (newUnits - remaining);
}

export async function logApiUsage(
  env: Env, apiName: string, action: string,
  userId: string | null, units: number = 1, customCost?: number
): Promise<void> {
  try {
    const cfg = API_COSTS[apiName];
    const unitType = cfg?.unitType ?? 'requests';
    const now = Date.now();
    const uid = userId ?? 'system';

    const existing = await env.DB.prepare(
      `SELECT call_count, total_units, estimated_cost_usd, user_ids FROM api_usage_log WHERE api_name = ?`
    ).bind(apiName).first() as any;

    const cost = customCost !== undefined ? customCost
      : cfg ? calcCost(cfg, existing?.total_units ?? 0, units) : 0;

    if (existing) {
      let userIds: string[] = [];
      try { userIds = JSON.parse(existing.user_ids || '[]'); } catch { userIds = []; }
      if (!userIds.includes(uid)) userIds.push(uid);
      await env.DB.prepare(`
        UPDATE api_usage_log
        SET call_count=call_count+1, total_units=total_units+?,
            unique_users=?, user_ids=?, estimated_cost_usd=estimated_cost_usd+?,
            last_called_at=?, updated_at=?
        WHERE api_name=?
      `).bind(units, userIds.length, JSON.stringify(userIds), cost, now, now, apiName).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO api_usage_log
          (api_name,unit_type,call_count,total_units,unique_users,user_ids,estimated_cost_usd,last_called_at,updated_at)
        VALUES (?,?,1,?,1,?,?,?,?)
      `).bind(apiName, unitType, units, JSON.stringify([uid]), cost, now, now).run();
    }
  } catch (e) {
    console.error('[ApiUsageLogger] Failed:', e);
  }
}