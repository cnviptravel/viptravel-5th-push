import React, { useEffect, useState } from 'react';
import { apiGetApiUsage, apiGetApiUsageDetail, apiGetApiUsageByDay } from '../services/api';

type Days = 1 | 7 | 30 | 90 | 180;
const ICONS: Record<string,string> = { whisper:'mic', m2m100:'translate', gemini_flash:'auto_awesome', pusher_message:'send', brevo_email:'email', metered_turn:'wifi_calling_3', cloudflare_calls:'videocam', mapbox_load:'map', mapbox_geocoding:'location_on', r2_storage:'storage', r2_upload:'cloud_upload', r2_download:'cloud_download' };
const COLORS: Record<string,string> = { whisper:'text-purple-500 bg-purple-50 dark:bg-purple-900/20', m2m100:'text-blue-500 bg-blue-50 dark:bg-blue-900/20', gemini_flash:'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', pusher_message:'text-green-500 bg-green-50 dark:bg-green-900/20', brevo_email:'text-pink-500 bg-pink-50 dark:bg-pink-900/20', metered_turn:'text-orange-500 bg-orange-50 dark:bg-orange-900/20', cloudflare_calls:'text-red-500 bg-red-50 dark:bg-red-900/20', mapbox_load:'text-teal-500 bg-teal-50 dark:bg-teal-900/20', mapbox_geocoding:'text-teal-400 bg-teal-50 dark:bg-teal-900/20', r2_storage:'text-slate-500 bg-slate-100 dark:bg-slate-800', r2_upload:'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20', r2_download:'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' };
const PERIOD_OPTS: { label: string; value: Days }[] = [{ label:'1 хоног', value:1 },{ label:'7 хоног', value:7 },{ label:'1 сар', value:30 },{ label:'3 сар', value:90 },{ label:'6 сар', value:180 }];

const AdminApiCosts: React.FC = () => {
  const [days, setDays] = useState<Days>(30);
  const [tab, setTab] = useState<'summary'|'daily'|'detail'>('summary');
  const [selectedApi, setSelectedApi] = useState<string|null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [daily, setDaily] = useState<any[]>([]);
  const [detail, setDetail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, d, det] = await Promise.all([apiGetApiUsage(days), apiGetApiUsageByDay(days), apiGetApiUsageDetail(days, selectedApi||undefined)]);
        setSummary(s);
        // detail болон daily нь шууд array буцаана
        setDaily(Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []));
        setDetail(Array.isArray(det) ? det : (Array.isArray(det?.data) ? det.data : []));
      } catch(e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [days, selectedApi]);

  const rows: any[] = summary?.rows || [];
  const totalCost: number = summary?.total_cost || 0;
  const dailyTotals: Record<string,number> = {};
  daily.forEach((r:any) => { dailyTotals[r.day] = (dailyTotals[r.day]||0) + (r.daily_cost||0); });
  const dayEntries = Object.entries(dailyTotals).sort();
  const maxDay = Math.max(...dayEntries.map(([,v])=>v), 0.0001);

  if (loading) return <div className="flex justify-center items-center h-48"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {PERIOD_OPTS.map(p => <button key={p.value} onClick={() => setDays(p.value)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${days===p.value?'bg-primary text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{p.label}</button>)}
      </div>
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-xs mb-1">Нийт тооцоолсон зардал ({days} хоног)</p>
        <p className="text-4xl font-black">${totalCost.toFixed(4)}</p>
        <p className="text-slate-400 text-xs mt-1">{rows.length} API · {rows.reduce((s:number,r:any)=>s+(r.call_count||0),0).toLocaleString()} дуудлага</p>
        <p className="text-slate-500 text-[10px] mt-1">* Тооцоолсон үнэ. Cloudflare/Google Dashboard-аас баталгаажуулна уу.</p>
      </div>
      <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800">
        {[['summary','API-аар'],['daily','Өдрөөр'],['detail','Дэлгэрэнгүй']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`pb-2 text-sm font-bold ${tab===k?'text-primary border-b-2 border-primary':'text-slate-400'}`}>{l}</button>
        ))}
      </div>
      {tab === 'summary' && (
        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="text-center py-10">
              <span className="material-symbols-outlined text-4xl text-slate-300">data_usage</span>
              <p className="text-slate-400 mt-2 text-sm">API usage logger-г backend-д нэмсний дараа мэдээлэл гарна</p>
            </div>
          ) : rows.map((row:any) => {
            const cc = COLORS[row.api_name]||'text-slate-500 bg-slate-100';
            const ic = ICONS[row.api_name]||'api';
            const pct = totalCost > 0 ? (row.total_cost/totalCost)*100 : 0;
            return (
              <div key={row.api_name} onClick={() => { setSelectedApi(row.api_name); setTab('detail'); }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cc}`}>
                    <span className="material-symbols-outlined text-lg">{ic}</span>
                  </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm dark:text-white truncate">{row.description}</p>
                  <p className="text-[10px] text-slate-400">{Number(row.call_count).toLocaleString()} дуудлага · {Number(row.total_units).toFixed(2)} {row.unit_type} · {Number(row.unique_users || row.call_count).toLocaleString()} хэрэглэгч</p>
                </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-sm text-orange-500">${Number(row.total_cost).toFixed(4)}</p>
                    <p className="text-[10px] text-slate-400">{pct.toFixed(1)}%</p>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'daily' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm dark:text-white mb-3">Өдөр тутмын зардал</h3>
          {dayEntries.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Мэдээлэл байхгүй</p> : (
            <div className="flex items-end gap-1 h-40 overflow-x-auto no-scrollbar">
              {dayEntries.map(([day,val]) => (
                <div key={day} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth:30 }}>
                  <span className="text-[9px] text-orange-500 font-bold">${val.toFixed(3)}</span>
                  <div className="w-5 bg-gradient-to-t from-orange-500 to-orange-300 rounded-t-md" style={{ height:`${Math.max((val/maxDay)*120,3)}px` }} />
                  <span className="text-[8px] text-slate-400">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === 'detail' && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => setSelectedApi(null)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${!selectedApi?'bg-primary text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>Бүгд</button>
            {Object.keys(ICONS).map(k => <button key={k} onClick={() => setSelectedApi(k)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${selectedApi===k?'bg-primary text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{k}</button>)}
          </div>
          {detail.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Мэдээлэл байхгүй</p> : detail.map((row:any,i:number) => {
            const d = new Date(row.last_called_at || row.updated_at || Date.now());
            return (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${COLORS[row.api_name]||'bg-slate-100 text-slate-500'}`}>
                  <span className="material-symbols-outlined text-sm">{ICONS[row.api_name]||'api'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold dark:text-white">{row.api_name} · {row.action}</p>
                  <p className="text-[10px] text-slate-400">{row.user_name||row.user_id||'system'} · {Number(row.units).toFixed(2)} {row.unit_type}</p>
                  <p className="text-[10px] text-slate-300">{d.toLocaleDateString()} {d.toLocaleTimeString()}</p>
                </div>
                <span className="text-xs font-black text-orange-500 flex-shrink-0">${Number(row.estimated_cost_usd).toFixed(5)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApiCosts;