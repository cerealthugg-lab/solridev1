import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Flame, Loader2, Sparkles, Trophy } from 'lucide-react';
import TrickCard from './TrickCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PAGE_SIZE = 20;

export default function TricksFeed({ currentUser }) {
  const [tricks, setTricks] = useState([]);
  const [tippedIds, setTippedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);

  const loadTipped = useCallback(async () => {
    try {
      const res = await api.get('/tricks/my-tips');
      setTippedIds(new Set(res.data.tipped_trick_ids || []));
    } catch (_e) {}
  }, []);

  const loadPage = useCallback(async (nextOffset) => {
    const res = await api.get('/tricks/feed', {
      params: { limit: PAGE_SIZE, offset: nextOffset },
    });
    return res.data || [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [firstPage] = await Promise.all([loadPage(0), loadTipped()]);
        if (cancelled) return;
        setTricks(firstPage);
        setOffset(firstPage.length);
        setReachedEnd(firstPage.length < PAGE_SIZE);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadPage, loadTipped]);

  const loadMore = async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      const more = await loadPage(offset);
      setTricks((prev) => [...prev, ...more]);
      setOffset(offset + more.length);
      if (more.length < PAGE_SIZE) setReachedEnd(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTipped = (trickId) => {
    setTippedIds((prev) => new Set(prev).add(trickId));
  };
  const handleDeleted = (trickId) => {
    setTricks((prev) => prev.filter((t) => t.id !== trickId));
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 selection:bg-[#D2FF00] selection:text-black">
      {/* Immersive Social Top Navigation Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-neutral-900/60">
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#FF3366] fill-[#FF3366] animate-pulse" />
          <h1 className="text-lg font-black uppercase tracking-tighter italic text-white">Trick Stream</h1>
        </div>
        <div className="flex items-center gap-1 bg-[#D2FF00]/10 border border-[#D2FF00]/20 px-2.5 py-0.5 rounded-full">
          <Sparkles size={10} className="text-[#D2FF00]" />
          <span className="text-[9px] font-black uppercase tracking-wider text-[#D2FF00]">M2E Live</span>
        </div>
      </header>

      {/* Main Stream Feed Container */}
      <div className="max-w-md mx-auto pt-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-neutral-500 text-xs font-bold uppercase tracking-widest gap-2">
            <Loader2 size={20} className="animate-spin text-[#D2FF00]" />
            <span>Syncing Street Logs...</span>
          </div>
        ) : tricks.length === 0 ? (
          <div className="mx-4 mt-8 p-8 bg-neutral-950 border border-neutral-900 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto border border-neutral-800">
              <Trophy size={18} className="text-neutral-600" />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-neutral-200">No clips dropped yet</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-[200px] mx-auto leading-relaxed">Open a spot on your local radar map and drop the first session clip! 🛹</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-0 sm:px-2" data-testid="tricks-feed-list">
            {/* Immersive Trick Card Feed List Container Loop */}
            {tricks.map((t) => (
              <div key={t.id} className="bg-neutral-950/40 border-b sm:border border-neutral-900 sm:rounded-2xl overflow-hidden pb-1">
                <TrickCard
                  trick={t}
                  currentUsername={currentUser?.username}
                  tippedByMe={tippedIds.has(t.id)}
                  onTipped={handleTipped}
                  onDeleted={handleDeleted}
                  autoplay
                />
              </div>
            ))}

            {/* Pagination Controls Footer Container */}
            <div className="pt-2 px-4">
              {!reachedEnd && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-testid="tricks-feed-load-more"
                  className="w-full h-11 bg-neutral-950 border border-neutral-900 rounded-xl text-neutral-400 font-extrabold uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:border-[#D2FF00]/40 hover:text-white"
                >
                  {loadingMore ? (
                    <><Loader2 size={12} className="animate-spin text-[#D2FF00]" /> Fetching Sessions...</>
                  ) : (
                    'Load More Clips'
                  )}
                </button>
              )}
              {reachedEnd && tricks.length > 0 && (
                <div className="text-center text-neutral-600 text-[9px] uppercase tracking-widest font-black py-6 select-none opacity-60">
                  ⚡ Basecamp Cache Fully Caught Up ⚡
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
