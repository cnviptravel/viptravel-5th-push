import React, { useEffect, useState } from 'react';
import { apiGetAllBookings, apiGetAllUsers } from '../services/api';
import { Booking, User } from '../types';

const AdminServiceLog: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [b, u] = await Promise.all([apiGetAllBookings(), apiGetAllUsers()]);
        setBookings([...b].sort((a, z) => Number(z.createdAt) - Number(a.createdAt)));
        setUsers(u);
      } finally { setLoading(false); }
    })();
  }, []);

  const getName = (id: string) => users.find(u => u._id === id || (u as any).id === id)?.name || id;
  const filtered = bookings.filter(b => {
    const q = search.toLowerCase();
    return (b.serviceTitle || '').toLowerCase().includes(q)
      || getName(b.customerId).toLowerCase().includes(q)
      || getName(b.providerId).toLowerCase().includes(q);
  });
  const totalRev = filtered.reduce((s, b) => s + (b.totalPrice || 0), 0);

  if (loading) return <div className="flex justify-center items-center h-48"><div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Хэрэглэгч, үйлчилгээ хайх..."
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm dark:text-white outline-none" />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Захиалга', val: filtered.length,                    color: 'dark:text-white' },
          { label: 'Орлого',   val: `$${totalRev.toLocaleString()}`,    color: 'text-green-500' },
          { label: 'Шимтгэл', val: `$${(totalRev*0.05).toFixed(2)}`,   color: 'text-purple-500' },
        ].map((c,i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-400">{c.label}</p>
            <p className={`text-lg font-black ${c.color}`}>{c.val}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 ? <p className="text-center text-slate-400 py-10">Захиалга байхгүй</p> : filtered.map(b => {
          const t = typeof b.createdAt === 'string' ? parseInt(b.createdAt) : Number(b.createdAt);
          return (
            <div key={b.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-sm dark:text-white">{b.serviceTitle || 'Үйлчилгээ'}</p>
                  <p className="text-[10px] text-slate-400">{new Date(t).toLocaleDateString('mn-MN')} · {(b.paymentMethod||'').toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-500 text-sm">${(b.totalPrice||0).toFixed(2)}</p>
                  <p className="text-[10px] text-purple-400">+${((b.totalPrice||0)*0.05).toFixed(2)} шимтгэл</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <p className="text-xs text-slate-500"><span className="text-slate-400">Захиалагч: </span><span className="font-bold dark:text-white">{getName(b.customerId)}</span></p>
                <p className="text-xs text-slate-500"><span className="text-slate-400">Үйлчлэгч: </span><span className="font-bold dark:text-white">{getName(b.providerId)}</span></p>
              </div>
              {b.guests && <p className="text-[10px] text-slate-400 mt-1">{b.guests} хүн · {b.date}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminServiceLog;