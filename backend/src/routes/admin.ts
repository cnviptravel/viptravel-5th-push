import { Env } from '../types/env';
import { requireAdmin } from '../middleware/auth';
import { errorResponse, successResponse } from '../utils/response';
import { API_COSTS } from '../utils/apiUsageLogger';

export async function handleGetApiUsage(request: Request, env: Env): Promise<Response> {
  try { await requireAdmin(request, env); } catch { return successResponse({ rows: [], total_cost: 0 }); }
  try {
    const result = await env.DB.prepare(`
      SELECT api_name, unit_type, call_count, total_units, unique_users,
             estimated_cost_usd as total_cost, last_called_at
      FROM api_usage_log ORDER BY estimated_cost_usd DESC, call_count DESC
    `).all();
    const rows = result.results.map((r: any) => ({
      ...r, description: API_COSTS[r.api_name]?.description || r.api_name,
    }));
    const total_cost = rows.reduce((s: number, r: any) => s + (r.total_cost || 0), 0);
    return successResponse({ rows, total_cost });
  } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Unknown error'); }
}

export async function handleGetApiUsageDetail(request: Request, env: Env): Promise<Response> {
  try { await requireAdmin(request, env); } catch { return successResponse([]); }
  try {
    const url = new URL(request.url);
    const apiName = url.searchParams.get('api') || null;
    let query = `SELECT api_name, unit_type, call_count, total_units, unique_users, estimated_cost_usd, last_called_at FROM api_usage_log`;
    const params: any[] = [];
    if (apiName) { query += ` WHERE api_name=?`; params.push(apiName); }
    query += ` ORDER BY estimated_cost_usd DESC`;
    const result = await env.DB.prepare(query).bind(...params).all();
    return successResponse(result.results);
  } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Unknown error'); }
}

export async function handleGetApiUsageByDay(request: Request, env: Env): Promise<Response> {
  try { await requireAdmin(request, env); } catch { return successResponse([]); }
  try {
    const result = await env.DB.prepare(`
      SELECT api_name, DATE(last_called_at/1000,'unixepoch') as day,
             call_count, estimated_cost_usd as daily_cost
      FROM api_usage_log ORDER BY last_called_at DESC
    `).all();
    return successResponse(result.results);
  } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Unknown error'); }
}

export async function handleGetAllBookings(request: Request, env: Env): Promise<Response> {
  try { await requireAdmin(request, env); } catch { return successResponse([]); }
  try {
    const result = await env.DB.prepare(`SELECT * FROM bookings ORDER BY createdAt DESC`).all();
    return successResponse(result.results);
  } catch (error) { return errorResponse(error instanceof Error ? error.message : 'Unknown error'); }
}
