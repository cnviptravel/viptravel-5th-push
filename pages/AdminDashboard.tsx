import React, { useEffect, useState } from 'react';
import { apiGetAllUsers, apiGetAllBookings } from '../services/api';
import { User, Booking } from '../types';

type Period = '1d' | '7d' | '1m' | '3m' | '6m' | '9m' | '12m';
const COMMISSION = 0.05;
const PERIODS: { label: string; value: Period; ms: number }[] = [
  { label: '1 хоног', value: '1d',  ms: 86400000 },
  { label: '7 хоног', value: '7d',  ms: 604800000 },
  { label: '1 сар',   value: '1m',  ms: 2592000000 },
  { label: '3 сар',   value: '3m',  ms: 7776000000 },
  { label: '6 сар',   value: '6m',  ms: 15552000000 },
  { label: '9 сар',   value: '9m',  ms: 23328000000 },
  { label: '12 сар',  value: '12m', ms: 31536000000 },
];

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [period, setPeriod] = useState<Period>('1m');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const u = await apiGetAllUsers();
        setUsers(u);
      } catch (e) {
        console.error('Failed to load users:', e);
      }
      try {
        const b = await apiGetAllBookings();
        setBookings(b);
      } catch (e) {
        console.error('Failed to load bookings:', e);
        setBookings([]);
      }
      setLoading(false);
    })();
  }, []);

  const ms = PERIODS.find(p => p.value === period)?.ms || 2592000000;
  const now = Date.now();
  const filtered = bookings.filter(b => {
    const t = typeof b.createdAt === 'string' ? parseInt(b.createdAt) : Number(b.createdAt);
    return now - t <= ms;
  });
  const revenue = filtered.reduce((s, b) => s + (b.totalPrice || 0), 0);

  const byMonth: Record<string, number> = {};
  users.forEach(u => {
    const t = Number((u as any).created_at || (u as any).createdAt || 0);
    if (!t) return;
    const key = new Date(t).toISOString().slice(0, 7);
    byMonth[key] = (byMonth[key] || 0) + 1;
  });
  const monthEntries = Object.entries(byMonth).sort().slice(-12);
  const maxMonth = Math.max(...monthEntries.map(([,v]) => v), 1);

  const byDay: Record<string, number> = {};
  filtered.forEach(b => {
    const t = typeof b.createdAt === 'string' ? parseInt(b.createdAt) : Number(b.createdAt);
    const key = new Date(t).toISOString().slice(5, 10);
    byDay[key] = (byDay[key] || 0) + (b.totalPrice || 0) * COMMISSION;
  });
  const dayEntries = Object.entries(byDay).sort();
  const maxDay = Math.max(...dayEntries.map(([,v]) => v), 0.0001);

  if (loading) return <div className="flex justify-center items-center h-48"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin" /></div>;

  const cards = [
    { label: 'Нийт хэрэглэгч', value: users.length,             icon: 'group',           color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Захиалга',        value: filtered.length,          icon: 'receipt_long',    color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Орлого',          value: `$${revenue.toLocaleString()}`, icon: 'payments', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Шимтгэл 5%',      value: `$${(revenue*COMMISSION).toFixed(2)}`, icon: 'account_balance', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${period === p.value ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-2`}>
              <span className={`material-symbols-outlined text-lg ${c.color}`}>{c.icon}</span>
            </div>
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className="text-xl font-black dark:text-white">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-sm dark:text-white mb-3">Шимтгэлийн орлого хоногоор</h3>
        {dayEntries.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Захиалга байхгүй</p> : (
          <div className="flex items-end gap-1 h-32 overflow-x-auto no-scrollbar">
            {dayEntries.map(([day, val]) => (
              <div key={day} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 28 }}>
                <div className="w-5 bg-primary rounded-t-md" style={{ height: `${Math.max((val/maxDay)*112, 4)}px` }} title={`$${val.toFixed(3)}`} />
                <span className="text-[9px] text-slate-400 rotate-45 origin-left whitespace-nowrap">{day}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-sm dark:text-white mb-3">Шинэ бүртгэл сараар</h3>
        {monthEntries.length === 0 ? <p className="text-slate-400 text-sm text-center py-6">Мэдээлэл байхгүй</p> : (
          <div className="flex items-end gap-1.5 h-32 overflow-x-auto no-scrollbar">
            {monthEntries.map(([m, cnt]) => (
              <div key={m} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 32 }}>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{cnt}</span>
                <div className="w-6 bg-blue-400 rounded-t-md" style={{ height: `${Math.max((cnt/maxMonth)*100, 4)}px` }} />
                <span className="text-[9px] text-slate-400">{m.slice(5)}р</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;