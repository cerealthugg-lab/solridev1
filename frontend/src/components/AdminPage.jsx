import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Users, MapPin, MessageCircle, Flag, TrendingUp, Shield } from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use(function (config) {
  var token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (tab === 'stats') api.get('/admin/stats').then(r => setStats(r.data)).catch(() => toast.error('Stats failed'));
    if (tab === 'users') api.get('/admin/users').then(r => setUsers(r.data)).catch(() => toast.error('Users failed'));
    if (tab === 'reports') api.get('/admin/reports').then(r => setReports(r.data)).catch(() => toast.error('Reports failed'));
  }, [tab]);

  const grantDFQ = async (username) => {
    const amount = parseFloat(prompt(`Grant DFQ to ${username}:`, '5'));
    if (!amount || isNaN(amount)) return;
    try {
      await api.post(`/admin/users/${username}/grant-dfq`, { amount });
      toast.success(`+${amount} DFQ to ${username}`);
      api.get('/admin/users').then(r => setUsers(r.data));
    } catch (e) { toast.error('Failed'); }
  };

  const banChat = async (username) => {
    const hours = parseInt(prompt(`Ban ${username} from chat (hours):`, '24'));
    if (!hours) return;
    try {
      await api.post(`/admin/users/${username}/ban-chat`, { hours, reason: 'admin' });
      toast.success(`Banned ${username} for ${hours}h`);
    } catch (e) { toast.error('Failed'); }
  };

  const unbanChat = async (username) => {
    try {
      await api.post(`/admin/users/${username}/unban-chat`);
      toast.success(`Unbanned ${username}`);
    } catch (e) { toast.error('Failed'); }
  };

  const deleteMessage = async (id) => {
    if (!window.confirm('Hide this message?')) return;
    try {
      await api.delete(`/admin/messages/${id}`);
      toast.success('Hidden');
      api.get('/admin/reports').then(r => setReports(r.data));
    } catch (e) { toast.error('Failed'); }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-[#FF3366] p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="text-zinc-500" size={22} /></button>
        <Shield className="text-[#FF3366]" size={20} />
        <p className="font-black uppercase tracking-widest text-sm">Admin Panel</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-800">
        {[
          { id: 'stats', icon: TrendingUp, label: 'Stats' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'reports', icon: Flag, label: 'Reports' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs uppercase tracking-widest transition-colors ${tab === t.id ? 'text-[#FF3366] border-b-2 border-[#FF3366]' : 'text-zinc-500'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {tab === 'stats' && stats && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { label: 'Users', value: stats.users, icon: Users },
            { label: 'Spots', value: stats.spots, icon: MapPin },
            { label: 'Rides', value: stats.rides, icon: TrendingUp },
            { label: 'Messages', value: stats.messages, icon: MessageCircle },
            { label: 'Reports', value: stats.reports, icon: Flag },
            { label: 'Total DFQ', value: stats.total_dfq.toFixed(2), icon: TrendingUp },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 p-4">
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest mb-2">
                <s.icon size={12} /> {s.label}
              </div>
              <div className="text-2xl font-black text-[#D2FF00]">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="p-4 space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-sm">
                    {u.username}
                    {u.is_admin && <span className="ml-2 text-[10px] text-[#FF3366] uppercase">Admin</span>}
                  </p>
                  <p className="text-[10px] text-zinc-500">{u.wallet_balance?.toFixed(2)} DFQ · joined {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {!u.is_admin && (
                <div className="flex gap-2">
                  <button onClick={() => grantDFQ(u.username)} className="text-[10px] px-2 py-1 bg-[#D2FF00] text-black font-bold uppercase tracking-widest">+DFQ</button>
                  <button onClick={() => banChat(u.username)} className="text-[10px] px-2 py-1 bg-[#FF3366] text-white font-bold uppercase tracking-widest">Ban</button>
                  <button onClick={() => unbanChat(u.username)} className="text-[10px] px-2 py-1 bg-zinc-800 text-white font-bold uppercase tracking-widest">Unban</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reports */}
      {tab === 'reports' && (
        <div className="p-4 space-y-2">
          {reports.length === 0 && <p className="text-center text-zinc-500 text-xs uppercase tracking-widest mt-8">No reports</p>}
          {reports.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-zinc-800 p-3">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Reported {new Date(r.created_at).toLocaleString()}</p>
                {r.message?.hidden && <span className="text-[10px] text-[#FF3366]">HIDDEN</span>}
              </div>
              {r.message ? (
                <>
                  <p className="text-xs font-bold text-white mb-1">{r.message.username}</p>
                  <p className="text-sm text-zinc-300 italic mb-2">"{r.message.content}"</p>
                  <div className="flex gap-2">
                    {!r.message.hidden && (
                      <button onClick={() => deleteMessage(r.message.id)} className="text-[10px] px-2 py-1 bg-[#FF3366] text-white font-bold uppercase tracking-widest">Hide</button>
                    )}
                    <button onClick={() => banChat(r.message.username)} className="text-[10px] px-2 py-1 bg-zinc-800 text-white font-bold uppercase tracking-widest">Ban Author</button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">Message deleted</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPage;
