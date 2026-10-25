import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Flame, Loader2, Sparkles, Trophy, Flag } from 'lucide-react';
import TrickCard from './TrickCard';
import ReportBlockSheet from './ReportBlockSheet';

const [reportOpen, setReportOpen] = useState(false);
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
    /* IMMERSIVE VERTICAL TRACKER: Pins the viewport height to lock full-bleed video components inside screen bounds */
    <div className="h-screen w-full bg-black text-white flex flex-col font-sans antialiased overflow-hidden selection:bg-[#D2FF00] selection:text-black">
      
      {/* 1. FIXED REELS-STYLE SOCIAL HEADER */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-md border-b border-neutral-900/60 shrink-0 h-14">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[#FF3366] fill-[#FF3366] animate-pulse" />
          <h1 className="text-base font-black uppercase tracking-tighter italic text-white">Trick Stream</h1>
        </div>

        {/* ALGORITHMIC DUAL SEGMENT FILTER TABS (Instagram Style View Options) */}
        <div className="flex bg-neutral-900/80 p-0.5 rounded-xl border border-neutral-800/60 text-[10px] font-black uppercase tracking-wider">
          <button className="px-3 py-1 bg-[#D2FF00] text-black rounded-lg transition-all shadow-md">
            Nearby
          </button>
          <button className="px-3 py-1 text-neutral-400 hover:text-white transition-all">
            Top Hype
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#D2FF00]/10 border border-[#D2FF00]/20 px-2.5 py-1 rounded-xl">
          <Sparkles size={10} className="text-[#D2FF00]" />
          <span className="text-[8px] font-black uppercase tracking-widest text-[#D2FF00] font-mono">M2E Live</span>
        </div>
      </header>

      {/* 2. MAIN SNAP-MANDATORY STREAM VIEWPORT - This segment behaves exactly like Instagram Reels */}
      <div className="flex-1 w-full max-w-md mx-auto relative bg-neutral-950">
        
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 text-xs font-bold uppercase tracking-widest gap-2 bg-black">
            <Loader2 size={22} className="animate-spin text-[#D2FF00]" />
            <span className="font-mono text-[10px]">Syncing Street Logs...</span>
          </div>
        ) : tricks.length === 0 ? (
          <div className="absolute inset-x-4 top-1/3 p-8 bg-black border border-neutral-900 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto border border-neutral-800">
              <Trophy size={18} className="text-neutral-500" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-neutral-200">No clips dropped yet</p>
              <p className="text-[11px] text-neutral-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                Open a spot on your local radar map and drop the first session clip! 🛹
              </p>
            </div>
          </div>
        ) : (
          /* VERTICAL SNAPPING VEHICLE CANVASES */
          <div 
            className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth custom-scrollbar pb-16" 
            data-testid="tricks-feed-list"
          >
            {tricks.map((t) => (
              <div 
                key={t.id} 
                className="w-full h-full snap-start shrink-0 relative flex flex-col justify-end bg-black border-b border-neutral-900/40"
              >
                {/* 
                  REELS COMPONENT INJECTION:
                  TrickCard handles your base absolute asset layers, vertical overlays,
                  and interaction buttons perfectly while layout parameters constrain boundaries edge-to-edge.
                */}
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

            {/* Pagination Controls Footer Container - Built right inside scrolling flow tracks */}
            <div className="snap-start shrink-0 w-full h-full flex flex-col items-center justify-center bg-black p-6 border-t border-neutral-900">
              {!reachedEnd ? (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  data-testid="tricks-feed-load-more"
                  className="w-full max-w-xs h-12 bg-neutral-900 border border-neutral-800 text-[#D2FF00] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 rounded-2xl active:scale-[0.96] transition-all hover:bg-neutral-800"
                >
                  {loadingMore ? (
                    <><Loader2 size={14} className="animate-spin text-[#D2FF00]" /> Fetching Sessions...</>
                  ) : (
                    'Load More Clips'
                  )}
                </button>
              ) : (
                <div className="text-center text-neutral-600 text-[10px] uppercase tracking-widest font-black py-4 select-none font-mono">
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
