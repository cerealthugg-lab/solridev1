import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Flame, Loader2 } from 'lucide-react';
import TrickCard from './TrickCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const PAGE_SIZE = 20;

/**
 * TricksFeed — the \"IG-lite for skaters\" page.
 * Props: currentUser: { username }
 */
function TricksFeed({ currentUser }) {
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
    <div className=\"space-y-4\">
      <header className=\"flex items-end justify-between gap-3\">
        <div>
          <h1 className=\"text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2\">
            <Flame size={22} className=\"text-[#FF3366]\" /> Tricks
          </h1>
          <p className=\"text-zinc-500 uppercase tracking-[0.2em] text-xs font-bold mt-1\">
            Land · Tip · Level up
          </p>
        </div>
      </header>

      {loading ? (
        <div className=\"flex items-center justify-center py-16 text-zinc-600 text-xs uppercase tracking-widest font-bold\">
          <Loader2 size={18} className=\"animate-spin mr-2\" /> Loading feed...
        </div>
      ) : tricks.length === 0 ? (
        <div className=\"border border-zinc-900 p-8 text-center\">
          <p className=\"text-zinc-400 text-sm\">
            No tricks yet. Open a spot on the map and drop the first clip. 🛹
          </p>
        </div>
      ) : (
        <>
          <div className=\"space-y-4\" data-testid=\"tricks-feed-list\">
            {tricks.map((t) => (
              <TrickCard
                key={t.id}
                trick={t}
                currentUsername={currentUser?.username}
                tippedByMe={tippedIds.has(t.id)}
                onTipped={handleTipped}
                onDeleted={handleDeleted}
                autoplay
              />
            ))}
          </div>

          {!reachedEnd && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              data-testid=\"tricks-feed-load-more\"
              className=\"w-full border border-zinc-800 hover:border-[#D2FF00] hover:text-[#D2FF00] text-zinc-400 py-3 font-black uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2\"
            >
              {loadingMore ? (<><Loader2 size={14} className=\"animate-spin\" /> Loading...</>) : 'Load more'}
            </button>
          )}
          {reachedEnd && tricks.length > 0 && (
            <div className=\"text-center text-zinc-700 text-[10px] uppercase tracking-[0.25em] font-bold py-4\">
              — end of feed —
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TricksFeed;
