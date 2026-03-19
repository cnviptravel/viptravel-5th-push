import { Env } from '../types/env';
import { requireAdmin } from '../middleware/auth';
import { errorHandler } from '../errors';
import { successResponse } from '../utils/response';
import { API_COSTS } from '../utils/apiUsageLogger';

export async function handleGetApiUsage(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const since = Date.now() - days * 86400000;
    const result = await env.DB.prepare(`
      SELECT api_name, COUNT(*) as call_count, SUM(units) as total_units,
             SUM(estimated_cost_usd) as total_cost, MAX(created_at) as last_used
      FROM api_usage_log WHERE created_at >= ?
      GROUP BY api_name ORDER BY total_cost DESC
    `).bind(since).all();
    const rows = result.results.map((r: any) => ({
      ...r,
      description: API_COSTS[r.api_name]?.description || r.api_name,
      unit_type: API_COSTS[r.api_name]?.unitType || 'requests',
    }));
    const total_cost = rows.reduce((s: number, r: any) => s + (r.total_cost || 0), 0);
    return successResponse({ rows, total_cost, period_days: days });
  } catch (error) { return errorHandler(error); }
}

export async function handleGetApiUsageDetail(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const apiName = url.searchParams.get('api') || null;
    const since = Date.now() - days * 86400000;
    let query = `
      SELECT l.api_name, l.action, l.user_id,
             u.full_name as user_name,
             l.units, l.unit_type, l.estimated_cost_usd, l.created_at
      FROM api_usage_log l
      LEFT JOIN users u ON CAST(l.user_id AS TEXT) = CAST(u.id AS TEXT)
      WHERE l.created_at >= ?
    `;
    const params: any[] = [since];
    if (apiName) { query += ` AND l.api_name = ?`; params.push(apiName); }
    query += ` ORDER BY l.created_at DESC LIMIT 500`;
    const result = await env.DB.prepare(query).bind(...params).all();
    return successResponse(result.results);
  } catch (error) { return errorHandler(error); }
}

export async function handleGetApiUsageByDay(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const since = Date.now() - days * 86400000;
    const result = await env.DB.prepare(`
      SELECT api_name,
             DATE(created_at / 1000, 'unixepoch') as day,
             COUNT(*) as call_count,
             SUM(estimated_cost_usd) as daily_cost
      FROM api_usage_log WHERE created_at >= ?
      GROUP BY api_name, day ORDER BY day DESC, daily_cost DESC
    `).bind(since).all();
    return successResponse(result.results);
  } catch (error) { return errorHandler(error); }
}

export async function handleGetAllBookings(request: Request, env: Env): Promise<Response> {
  try {
    await requireAdmin(request, env);
    const result = await env.DB.prepare(
      `SELECT * FROM bookings ORDER BY createdAt DESC`
    ).all();
    return successResponse(result.results);
  } catch (error) { return errorHandler(error); }
}
