import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trash2, Coins, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import { toast } from './ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * TrickCard — displays a single trick clip.
 * Props:
 *   trick: { id, user_id, spot_id, spot_name, trick_name, caption, video_url,
 *            duration_seconds, tagged_users, tips_received, created_at }
 *   currentUsername: string (for own-trick affordances)
 *   tippedByMe: boolean
 *   onTipped: (trickId) => void
 *   onDeleted: (trickId) => void
 *   autoplay: boolean (feed context)
 */
function TrickCard({ trick, currentUsername, tippedByMe, onTipped, onDeleted, autoplay = true }) {
  const [tips, setTips] = useState(Number(trick.tips_received) || 0);
  const [tipped, setTipped] = useState(tippedByMe);
  const [tipping, setTipping] = useState(false);
    const [muted, setMuted] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => { setTipped(tippedByMe); }, [tippedByMe]);

  // Autoplay when in viewport (TikTok-style)
  useEffect(() => {
    if (!autoplay) return;
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.6 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [autoplay]);

  const isOwn = currentUsername && currentUsername === trick.user_id;

  const tip = async () => {
    if (tipping || tipped || isOwn) return;
    setTipping(true);
    try {
      const res = await api.post(`/tricks/${trick.id}/tip`);
      setTips(res.data.new_tips_total);
      setTipped(true);
      onTipped?.(trick.id);
      toast.success('Tipped 1 DFQ 🛹');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Tip failed';
      if (String(msg).toLowerCase().includes('already')) setTipped(true);
      toast.error(msg);
    } finally {
      setTipping(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this trick?')) return;
    try {
      await api.delete(`/tricks/${trick.id}`);
      toast.success('Trick removed');
      onDeleted?.(trick.id);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  const when = new Date(trick.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <article
      data-testid={`trick-card-${trick.id}`}
      className="border border-zinc-900 bg-[#0a0a0d] overflow-hidden"
    >
  {/* Header — one line: "<spot> by @<user>" */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-900">
        <div className="min-w-0 flex items-center gap-1.5 text-sm font-black uppercase tracking-tight">
          <MapPin size={14} className={`shrink-0 ${trick.spot_id ? 'text-[#D2FF00]' : 'text-zinc-600'}`} />
          {trick.spot_id ? (
            <Link
              to={`/spots?focus=${trick.spot_id}`}
              data-testid={`trick-spot-${trick.id}`}
              className="text-white hover:text-[#D2FF00] truncate max-w-[45%]"
            >
              {trick.spot_name || 'Unknown spot'}
            </Link>
        ) : (trick.spot_lat && trick.spot_lng) ? (
            <a
              href={`https://www.google.com/maps?q=${trick.spot_lat},${trick.spot_lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#FF3366] hover:underline truncate max-w-[60%]"
              title="This spot was removed"
            >
              {trick.spot_name ? `${trick.spot_name} (removed)` : 'Spot removed'} · {Number(trick.spot_lat).toFixed(4)}, {Number(trick.spot_lng).toFixed(4)}
            </a>
          ) : (
            <span className="text-zinc-500 truncate max-w-[45%]">Unknown spot</span>
          )}
          <span className="text-zinc-600 font-bold">by</span>
          <Link
            to={`/skater/${trick.user_id}`}
            data-testid={`trick-user-${trick.id}`}
            className="text-zinc-300 hover:text-[#D2FF00] truncate"
          >
            @{trick.user_id}
          </Link>
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold shrink-0">
          {when}
        </div>
      </header>

  {/* Video */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={trick.video_url}
          controls={!autoplay}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="w-full max-h-[70vh] object-contain bg-black"
          onClick={(e) => e.currentTarget.paused ? e.currentTarget.play() : e.currentTarget.pause()}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
          data-testid={`trick-mute-${trick.id}`}
          className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 border border-white/10"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>

      {/* Trick name + caption + tags */}
      <div className="px-4 py-3 border-b border-zinc-900 space-y-2">
        <div className="text-white text-sm font-black uppercase tracking-widest">
          {trick.trick_name}
        </div>
        {trick.caption && (
          <p className="text-sm text-zinc-300 leading-snug whitespace-pre-wrap break-words">
            {trick.caption}
          </p>
        )}
        {trick.tagged_users && trick.tagged_users.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {trick.tagged_users.map((u) => (
              <Link key={u} to={`/skater/${u}`} className="text-[11px] font-bold text-[#00D2FF] hover:text-white">
                @{u}
              </Link>
            ))}
          </div>
        )}
      </div>
    

      {/* Actions */}
      <footer className="flex items-center justify-between px-4 py-3">
        <button
          onClick={tip}
          disabled={tipping || tipped || isOwn}
          data-testid={`trick-tip-${trick.id}`}
          className={`flex items-center gap-2 px-3 py-2 border transition-colors font-black uppercase tracking-widest text-xs ${
            tipped
              ? 'border-[#D2FF00] bg-[#D2FF00]/10 text-[#D2FF00] cursor-default'
              : isOwn
              ? 'border-zinc-900 text-zinc-700 cursor-not-allowed'
              : 'border-zinc-800 text-white hover:border-[#D2FF00] hover:text-[#D2FF00]'
          }`}
          title={isOwn ? "Can't tip your own trick" : tipped ? 'Already tipped' : 'Tip 1 DFQ'}
        >
          <Coins size={14} strokeWidth={2.5} />
          {tipped ? 'Tipped' : isOwn ? '+ tips only' : 'Tip 1 DFQ'}
          <span className="text-zinc-500">·</span>
          <span data-testid={`trick-tip-count-${trick.id}`}>{tips.toFixed(0)}</span>
        </button>

        {isOwn && (
          <button
            onClick={remove}
            data-testid={`trick-delete-${trick.id}`}
            className="text-zinc-600 hover:text-[#FF3366] p-2"
            aria-label="Delete trick"
          >
            <Trash2 size={14} />
          </button>
        )}
      </footer>
    </article>
  );
}

export default TrickCard;