import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Flame, Loader2, Sparkles, Trophy } from 'lucide-react';
import TrickCard from './TrickCard';
import { toast } from './ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PAGE_SIZE = 20;
const PERIODS = [
  { key: 'day', label: 'Today', badge: 'today' },
  { key: 'week', label: 'This week', badge: 'this week' },
];

const Tab = ({ active, onClick, children, testId }) => (
  <button onClick={onClick} data-testid={testId}
    className={`px-4 h-9 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${active ? 'bg-[#D2FF00] text-black' : 'text-neutral-400 hover:text-white'}`}>
    {children}
  </button>
);

export default function TricksFeed({ currentUser }) {
  const [mode, setMode] = useState('fresh');
  const [period, setPeriod] = useState('day');
  const [tricks, setTricks] = useState([]);
  const [tippedIds, setTippedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);

  const loadMine = useCallback(async () => {
    const [tips, saves] = await Promise.allSettled([api.get('/tricks/my-tips'), api.get('/tricks/my-saves')]);
    if (tips.status === 'fulfilled') setTippedIds(new Set(tips.value.data.tipped_trick_ids || []));
    if (saves.status === 'fulfilled') setSavedIds(new Set(saves.value.data.saved_trick_ids || []));
  }, []);

  useEffect(() => { loadMine(); }, [loadMine]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTricks([]);
    const req = mode === 'top'
      ? api.get('/tricks/top', { params: { period } })
      : api.get('/tricks/feed', { params: { limit: PAGE_SIZE, offset: 0 } });
    req.then((r) => {
      if (cancelled) return;
      const rows = r.data || [];
      setTricks(rows);
      setOffset(rows.length);
      setReachedEnd(mode === 'top' || rows.length < PAGE_SIZE);
    })
      .catch(() => { if (!cancelled) toast.error("Couldn't load tricks"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, period]);

  const loadMore = async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const res = await api.get('/tricks/feed', { params: { limit: PAGE_SIZE, offset } });
      const more = res.data || [];
      setTricks((prev) => [...prev, ...more]);
      setOffset(offset + more.length);
      if (more.length < PAGE_SIZE) setReachedEnd(true);
    } catch (_e) {
      toast.error("Couldn't load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTipped = (id) => setTippedIds((prev) => new Set(prev).add(id));
  const handleSaved = (id, saved) => setSavedIds((prev) => {
    const next = new Set(prev);
    if (saved) next.add(id); else next.delete(id);
    return next;
  });
  const handleDeleted = (id) => setTricks((prev) => prev.filter((t) => t.id !== id));
  const periodBadge = PERIODS.find((p) => p.key === period)?.badge;

  return (
    <div className="-mx-4 lg:mx-0 max-w-md lg:max-w-xl mx-auto bg-black text-white min-h-screen" data-testid="tricks-feed">
      {/* Header + Fresh / Top Hype switch */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-900 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
            <Flame size={18} className="text-[#FF3366] fill-[#FF3366]" /> Tricks
          </h1>
          <div className="flex bg-neutral-900 p-1 rounded-full border border-neutral-800">
            <Tab active={mode === 'fresh'} onClick={() => setMode('fresh')} testId="feed-tab-fresh"><Sparkles size={12} /> Fresh</Tab>
            <Tab active={mode === 'top'} onClick={() => setMode('top')} testId="feed-tab-top"><Flame size={12} /> Top Hype</Tab>
          </div>
        </div>
        {mode === 'top' && (
          <div className="flex gap-2">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} data-testid={`feed-period-${p.key}`}
                className={`px-3 h-8 rounded-full border text-xs font-bold transition-colors ${period === p.key ? 'border-[#D2FF00]/60 bg-[#D2FF00]/10 text-[#D2FF00]' : 'border-neutral-800 text-neutral-400'}`}>
                {p.label}
              </button>
            ))}
            <span className="ml-auto self-center text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Most DFQ hyped</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest" data-testid="tricks-feed-loading">
          <Loader2 size={22} className="animate-spin text-[#D2FF00]" /> Loading tricks...
        </div>
      ) : tricks.length === 0 ? (
        <div className="mx-4 mt-10 p-8 border border-neutral-900 rounded-2xl text-center space-y-3" data-testid="tricks-feed-empty">
          <Trophy size={20} className="text-neutral-500 mx-auto" />
          <p className="text-sm font-black uppercase text-neutral-200">
            {mode === 'top' ? `No hype ${periodBadge} yet` : 'No clips dropped yet'}
          </p>
          <p className="text-xs text-neutral-500">
            {mode === 'top' ? 'Hype a trick with 1 DFQ to put it on the board.' : 'Open a spot on the map and drop the first clip 🛹'}
          </p>
        </div>
      ) : (
        <div data-testid="tricks-feed-list">
          {tricks.map((t, i) => (
            <TrickCard
              key={t.id}
              trick={t}
              currentUsername={currentUser?.username}
              tippedByMe={tippedIds.has(t.id)}
              savedByMe={savedIds.has(t.id)}
              onTipped={handleTipped}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              rank={mode === 'top' ? i + 1 : undefined}
              periodLabel={mode === 'top' ? periodBadge : undefined}
            />
          ))}
          <div className="py-8 flex justify-center">
            {!reachedEnd ? (
              <button onClick={loadMore} disabled={loadingMore} data-testid="tricks-feed-load-more"
                className="h-11 px-6 rounded-full bg-neutral-900 border border-neutral-800 text-[#D2FF00] text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-transform">
                {loadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : 'Load more'}
              </button>
            ) : (
              <span className="text-[10px] uppercase tracking-widest font-black text-neutral-600">You're all caught up</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
