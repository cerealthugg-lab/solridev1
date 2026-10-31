import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from './ui/sonner';
import { Shield, MapPin, Video, MessageCircle, Users, AlertTriangle, Trash2, EyeOff, BarChart3, RefreshCw, ChevronRight, Search, Coins, Route } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: BACKEND_URL + '/api' });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

const card = 'rounded-2xl bg-neutral-950 border border-neutral-800';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '');

const Empty = ({ icon: Icon, text }) => (
  <div data-testid="admin-empty" className={`${card} py-12 flex flex-col items-center gap-3 text-neutral-500`}>
    <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center"><Icon size={20} /></div>
    <span className="text-sm">{text}</span>
  </div>
);

const IconBtn = ({ onClick, label, children, testId, danger = true }) => (
  <button
    onClick={onClick}
    aria-label={label}
    data-testid={testId}
    className={`w-10 h-10 shrink-0 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center transition-colors ${danger ? 'hover:text-[#FF3366] hover:border-[#FF3366]/40' : 'hover:text-[#D2FF00]'}`}
  >
    {children}
  </button>
);

const ConfirmSheet = ({ confirm, onCancel }) => {
  if (!confirm) return null;
  return (
    <div data-testid="admin-confirm-sheet" className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm bg-[#09090b] border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-neutral-800 mb-4 sm:hidden" />
        <div className="w-12 h-12 rounded-full bg-[#FF3366]/15 text-[#FF3366] flex items-center justify-center mb-3"><AlertTriangle size={22} /></div>
        <h3 className="text-lg font-black text-white tracking-tight">{confirm.title}</h3>
        {confirm.text && <p className="text-sm text-neutral-400 mt-1">{confirm.text}</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button data-testid="admin-confirm-cancel" onClick={onCancel} className="h-12 rounded-full bg-neutral-900 border border-neutral-800 text-white font-semibold text-sm">Cancel</button>
          <button
            data-testid="admin-confirm-ok"
            onClick={() => { const fn = confirm.onConfirm; onCancel(); fn(); }}
            className="h-12 rounded-full bg-[#FF3366] text-white font-semibold text-sm active:scale-[0.98] transition-transform"
          >
            {confirm.cta || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

function AdminPage() {
  const [tab, setTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [spots, setSpots] = useState([]);
  const [tricks, setTricks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reports, setReports] = useState([]);
  const [adminStatus, setAdminStatus] = useState('loading');
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api.get('/users/me')
      .then((res) => setAdminStatus(res.data && res.data.is_admin === true ? 'admin' : 'denied'))
      .catch(() => setAdminStatus('denied'));
  }, []);

  const fetchStats = async () => { try { const r = await api.get('/admin/stats'); setStats(r.data); } catch (e) {} };
  const fetchUsers = async () => { try { const r = await api.get('/admin/users'); setUsers(r.data || []); } catch (e) {} };
  const fetchSpots = async () => { try { const r = await api.get('/spots'); setSpots(r.data || []); } catch (e) {} };
  const fetchTricks = async () => { try { const r = await api.get('/tricks/feed?limit=100'); setTricks(r.data || []); } catch (e) {} };
  const fetchMessages = async () => { try { const r = await api.get('/chat/messages'); setMessages(r.data || []); } catch (e) {} };
  const fetchReports = async () => { try { const r = await api.get('/admin/reports'); setReports(r.data || []); } catch (e) {} };

  const refreshAll = () => {
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers(), fetchSpots(), fetchTricks(), fetchMessages(), fetchReports()])
      .finally(() => setLoading(false));
  };

  useEffect(refreshAll, []);

  const deleteSpot = (id, name) => setConfirm({
    title: `Delete "${name}"?`, text: 'The spot is removed from the map. This can\'t be undone.', cta: 'Delete',
    onConfirm: async () => {
      try { await api.delete('/admin/spots/' + id); toast.success('Spot deleted'); fetchSpots(); fetchStats(); }
      catch (e) { toast.error('Failed to delete spot'); }
    },
  });

  const deleteTrick = (id, name) => setConfirm({
    title: `Delete "${name || 'this trick'}"?`, text: 'The clip is removed from the feed. This can\'t be undone.', cta: 'Delete',
    onConfirm: async () => {
      try { await api.delete('/tricks/' + id); toast.success('Trick deleted'); fetchTricks(); fetchStats(); }
      catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete trick'); }
    },
  });

  const hideMessage = async (id) => {
    try { await api.delete('/admin/messages/' + id); toast.success('Message hidden'); fetchMessages(); fetchStats(); fetchReports(); }
    catch (e) { toast.error('Failed'); }
  };

  const banChat = (username, hours, label) => setConfirm({
    title: `Ban @${username} for ${label}?`, text: 'They won\'t be able to post in chat until the ban ends.', cta: 'Ban',
    onConfirm: async () => {
      try { await api.post('/admin/users/' + username + '/ban-chat', { hours, reason: 'admin action' }); toast.success(`@${username} banned for ${label}`); fetchUsers(); }
      catch (e) { toast.error('Failed to ban'); }
    },
  });

  const unbanChat = async (username) => {
    try { await api.post('/admin/users/' + username + '/unban-chat'); toast.success(`@${username} unbanned`); fetchUsers(); }
    catch (e) { toast.error('Failed'); }
  };

  if (adminStatus === 'loading') {
    return (
      <div data-testid="admin-loading" className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="w-8 h-8 border-2 border-[#D2FF00] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-neutral-500">Checking access...</span>
      </div>
    );
  }

  if (adminStatus === 'denied') {
    return (
      <div data-testid="admin-denied" className="flex items-center justify-center min-h-[60vh]">
        <div className={`${card} p-8 text-center max-w-xs`}>
          <div className="w-14 h-14 rounded-full bg-[#FF3366]/15 text-[#FF3366] flex items-center justify-center mx-auto mb-4"><Shield size={26} /></div>
          <h2 className="text-xl font-black text-white tracking-tight">Access denied</h2>
          <p className="text-neutral-500 text-sm mt-1">This area is for admins only.</p>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filteredUsers = q ? users.filter((u) => (u.username || '').toLowerCase().includes(q)) : users;

  const tabs = [
    { key: 'stats', label: 'Overview', icon: BarChart3 },
    { key: 'users', label: 'Users', count: users.length, icon: Users },
    { key: 'spots', label: 'Spots', count: spots.length, icon: MapPin },
    { key: 'tricks', label: 'Tricks', count: tricks.length, icon: Video },
    { key: 'chat', label: 'Chat', count: messages.length, icon: MessageCircle },
    { key: 'reports', label: 'Reports', count: reports.length, icon: AlertTriangle, alert: reports.length > 0 },
  ];

  const statCards = stats ? [
    { label: 'Users', value: stats.users, color: '#D2FF00', icon: Users },
    { label: 'Spots', value: stats.spots, color: '#00D2FF', icon: MapPin },
    { label: 'Rides', value: stats.rides, color: '#FF9900', icon: Route },
    { label: 'Messages', value: stats.messages, color: '#A855F7', icon: MessageCircle },
    { label: 'Reports', value: stats.reports, color: '#FF3366', icon: AlertTriangle },
    { label: 'Total DFQ', value: typeof stats.total_dfq === 'number' ? stats.total_dfq.toFixed(2) : stats.total_dfq, color: '#D2FF00', icon: Coins },
  ] : [];

  return (
    <div className="space-y-5" data-testid="admin-page">
      <div className="flex items-center justify-between pt-2">
        <div className="min-w-0">
          <p className="text-xs text-neutral-500">Moderation</p>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Admin panel <Shield size={20} className="text-[#FF3366]" />
          </h1>
        </div>
        <IconBtn onClick={refreshAll} label="Refresh" testId="admin-refresh-button" danger={false}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </IconBtn>
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-1" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              data-testid={`admin-tab-${t.key}`}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full border text-xs font-semibold transition-colors ${active ? 'bg-white text-black border-white' : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'}`}
            >
              <Icon size={14} /> {t.label}
              {t.count !== undefined && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] inline-flex items-center justify-center ${t.alert ? 'bg-[#FF3366] text-white' : active ? 'bg-black/10' : 'bg-neutral-800 text-neutral-300'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'stats' && (
        stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-testid="admin-stats">
            {statCards.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} data-testid={`admin-stat-${s.label.toLowerCase().replace(/\s+/g, '-')}`} className={`${card} relative overflow-hidden p-4`}>
                  <div className="absolute -top-10 -right-8 w-28 h-28 rounded-full blur-2xl" style={{ backgroundColor: s.color + '1A' }} />
                  <div className="relative w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: s.color + '1f', color: s.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="relative mt-3 text-2xl font-black text-white tracking-tight truncate">{s.value ?? 0}</div>
                  <div className="relative text-xs text-neutral-500">{s.label}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon={BarChart3} text={loading ? 'Loading stats...' : 'No stats yet'} />
        )
      )}

      {tab === 'users' && (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username"
              autoCapitalize="off"
              autoCorrect="off"
              data-testid="admin-user-search"
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-neutral-900/80 border border-neutral-800 focus:border-[#D2FF00]/50 outline-none text-base text-white placeholder:text-neutral-600"
            />
          </div>
          {filteredUsers.length === 0 && <Empty icon={Users} text="No users found" />}
          {filteredUsers.map((u) => (
            <div key={u.username} data-testid={`admin-user-${u.username}`} className={`${card} p-4`}>
              <a href={'/skater/' + u.username} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-sm font-black text-[#D2FF00] shrink-0">
                  {u.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">@{u.username}</span>
                    {u.is_admin && <span className="text-[10px] font-semibold bg-[#FF3366]/15 text-[#FF3366] px-2 py-0.5 rounded-full">Admin</span>}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    {(u.wallet_balance || 0).toFixed(2)} DFQ · Joined {fmtDate(u.created_at)}
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-600 shrink-0" />
              </a>
              <div className="flex gap-2 overflow-x-auto mt-3 pt-3 border-t border-neutral-900" style={{ scrollbarWidth: 'none' }}>
                {[[1, '1 hour', '1h'], [24, '24 hours', '24h'], [720, '30 days', '30d']].map(([h, label, short]) => (
                  <button
                    key={h}
                    onClick={() => banChat(u.username, h, label)}
                    data-testid={`admin-ban-${short}-${u.username}`}
                    className="shrink-0 px-3 h-9 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold text-neutral-400 hover:text-[#FF3366] hover:border-[#FF3366]/40 transition-colors"
                  >
                    Ban {short}
                  </button>
                ))}
                <button
                  onClick={() => unbanChat(u.username)}
                  data-testid={`admin-unban-${u.username}`}
                  className="shrink-0 px-3 h-9 rounded-full bg-[#D2FF00]/10 border border-[#D2FF00]/20 text-xs font-semibold text-[#D2FF00] transition-colors"
                >
                  Unban
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'spots' && (
        <div className="space-y-3">
          {spots.length === 0 && <Empty icon={MapPin} text="No spots yet" />}
          {spots.map((spot) => (
            <div key={spot.id} data-testid={`admin-spot-${spot.id}`} className={`${card} p-4 flex gap-3 items-start`}>
              {spot.photos && spot.photos.length > 0 ? (
                <img src={spot.photos[0]} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#00D2FF]/10 text-[#00D2FF] flex items-center justify-center shrink-0"><MapPin size={20} /></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white truncate">{spot.name}</span>
                  {spot.spot_type && <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400">{spot.spot_type}</span>}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">by @{spot.user_id} · {fmtDate(spot.created_at)}</div>
                {spot.description && <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{spot.description}</p>}
              </div>
              <IconBtn onClick={() => deleteSpot(spot.id, spot.name)} label="Delete spot" testId={`admin-delete-spot-${spot.id}`}>
                <Trash2 size={16} />
              </IconBtn>
            </div>
          ))}
        </div>
      )}

      {tab === 'tricks' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tricks.length === 0 && <div className="sm:col-span-2"><Empty icon={Video} text="No tricks yet" /></div>}
          {tricks.map((trick) => (
            <div key={trick.id} data-testid={`admin-trick-${trick.id}`} className={`${card} overflow-hidden`}>
              {trick.video_url && (
                <video src={trick.video_url} className="w-full aspect-video object-cover bg-black" controls playsInline preload="metadata" />
              )}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-white truncate">{trick.trick_name || 'Untitled'}</div>
                  <div className="text-xs text-neutral-500 mt-0.5 truncate">
                    @{trick.user_id}{trick.spot_name ? ` · ${trick.spot_name}` : ''}
                  </div>
                  <div className="text-xs text-neutral-600 mt-0.5">{fmtDate(trick.created_at)} · {trick.tips_received || 0} DFQ tips</div>
                </div>
                <IconBtn onClick={() => deleteTrick(trick.id, trick.trick_name)} label="Delete trick" testId={`admin-delete-trick-${trick.id}`}>
                  <Trash2 size={16} />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'chat' && (
        messages.length === 0 ? <Empty icon={MessageCircle} text="No messages" /> : (
          <div className={`${card} divide-y divide-neutral-900 overflow-hidden`}>
            {messages.map((msg) => (
              <div key={msg.id} data-testid={`admin-message-${msg.id}`} className={`flex items-center gap-3 p-4 ${msg.flagged ? 'bg-[#FF3366]/10' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">@{msg.username}</span>
                    {msg.flagged && <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FF3366]/15 text-[#FF3366]">Flagged</span>}
                  </div>
                  <p className="text-sm text-neutral-400 mt-0.5 line-clamp-2 break-words">{msg.content}</p>
                  <span className="text-[11px] text-neutral-600">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}</span>
                </div>
                <IconBtn onClick={() => hideMessage(msg.id)} label="Hide message" testId={`admin-hide-message-${msg.id}`}>
                  <EyeOff size={16} />
                </IconBtn>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 && <Empty icon={Shield} text="No reports, all clean" />}
          {reports.map((r) => {
            const msg = r.message;
            return (
              <div key={r.id} data-testid={`admin-report-${r.id}`} className="rounded-2xl border border-[#FF3366]/25 bg-[#FF3366]/5 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FF3366]/15 text-[#FF3366]">
                    <AlertTriangle size={11} /> {r.reason || 'Report'}
                  </span>
                  <span className="text-xs text-neutral-500">by @{r.reporter_id} · {fmtDate(r.created_at)}</span>
                </div>
                {msg && (
                  <div className="mt-3 rounded-xl bg-neutral-950 border border-neutral-800 p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white">@{msg.username}</span>
                      <p className="text-sm text-neutral-400 break-words">{msg.content}</p>
                      {msg.hidden && <span className="text-[11px] font-semibold text-[#FF3366]">Already hidden</span>}
                    </div>
                    {!msg.hidden && (
                      <IconBtn onClick={() => hideMessage(msg.id)} label="Hide message" testId={`admin-report-hide-${r.id}`}>
                        <EyeOff size={16} />
                      </IconBtn>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmSheet confirm={confirm} onCancel={() => setConfirm(null)} />
    </div>
  );
}

export default AdminPage;