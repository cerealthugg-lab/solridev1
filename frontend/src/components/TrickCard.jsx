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
  const [showRemovedInfo, setShowRemovedInfo] = useState(false);
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
      className="w-full h-full relative flex flex-col justify-end bg-black text-white select-none overflow-hidden"
    >
      
      {/* 1. BASE LAYER: Full-Bleed HTML5 Video Stream Canvas */}
      <div 
        className="absolute inset-0 w-full h-full bg-black z-0 cursor-pointer"
        onClick={function (e) {
          var v = videoRef.current;
          if (!v) return;
          if (v.paused) { v.play().catch(function(){}); } else { v.pause(); }
        }}
      >
        <video
          ref={videoRef}
          src={trick.video_url}
          controls={false}
          loop
          muted={muted}
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
        
        {/* Soft immersive dark vignette overlay protecting readable text layers */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />
      </div>

      {/* 2. OVERLAY LAYER: Right-Aligned Action Control Sidebar Pillar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
        
        {/* M2E Token Action Node */}
        <button
          onClick={tip}
          disabled={tipping || tipped || isOwn}
          data-testid={`trick-tip-${trick.id}`}
          className={'w-12 h-12 rounded-2xl flex flex-col items-center justify-center border transition-all transform active:scale-90 ' + (
            tipped
              ? 'border-[#D2FF00] bg-[#D2FF00]/20 text-[#D2FF00]'
              : isOwn
              ? 'border-neutral-900 bg-neutral-950/40 text-neutral-700 cursor-not-allowed'
              : 'border-neutral-800/80 bg-black/40 backdrop-blur-md text-white hover:border-[#D2FF00]'
          )}
          style={{ minHeight: '48px', minWidth: '48px' }}
        >
          <Coins size={18} className={tipping ? "animate-spin" : ""} />
        </button>
        <span className={'text-[10px] font-mono font-bold tracking-tight ' + (tipped ? 'text-[#D2FF00]' : 'text-zinc-400')}>
          {tips}
        </span>

        {/* Global Inline Audio Mute Key Trigger */}
        <button
          type="button"
          onClick={function (e) { e.stopPropagation(); setMuted(function(m) { return !m; }); }}
          data-testid={`trick-mute-${trick.id}`}
          className="w-11 h-11 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-full flex items-center justify-center border border-neutral-800/80 transition-all active:scale-90"
          style={{ minHeight: '44px', minWidth: '44px' }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={16} className="text-zinc-400" /> : <Volume2 size={16} className="text-[#D2FF00]" />}
        </button>

        {/* Dynamic Context Deletion Flag (Renders only for the profile creator) */}
        {isOwn && (
          <button
            onClick={remove}
            className="w-11 h-11 bg-red-950/40 backdrop-blur-md border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center transition-all active:scale-90 mt-2"
            style={{ minHeight: '44px', minWidth: '44px' }}
            title="Remove trick segment"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* 3. OVERLAY LAYER: Bottom Screen Meta Context Panel Layout (Left-Aligned) */}
      <div className="p-4 pb-6 z-10 max-w-[84%] text-left space-y-2 pointer-events-auto">
        
        {/* Header - Track Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-tight">
          <Link
            to={`/skater/${trick.user_id}`}
            data-testid={`trick-user-${trick.id}`}
            className="text-white hover:text-[#D2FF00] bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-xl border border-neutral-800/40 text-xs font-black tracking-wide"
          >
            @{trick.user_id}
          </Link>
          
          <span className="text-neutral-500 font-mono text-[9px] lowercase tracking-normal">at</span>

          {trick.spot_id ? (
            <Link
              to={`/spots?focus=${trick.spot_id}`}
              data-testid={`trick-spot-${trick.id}`}
              className="flex items-center gap-1 text-[#D2FF00] hover:underline bg-black/40 backdrop-blur-md px-2 py-1 rounded-xl border border-[#D2FF00]/10 max-w-[180px] truncate"
            >
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{trick.spot_name || 'Unknown spot'}</span>
            </Link>
          ) : (
            <span className="relative inline-flex items-center">
              <button
                type="button"
                onClick={function () { setShowRemovedInfo(function(v) { return !v; }); }}
                className="flex items-center gap-1 text-neutral-500 hover:text-neutral-400 bg-black/20 px-2 py-1 rounded-xl text-xs border border-neutral-900/60"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block shrink-0" />
                {trick.spot_name || 'Spot removed'}
              </button>

              {showRemovedInfo && (
                <div className="absolute bottom-8 left-0 reconstruction-modal z-30 w-52 p-3 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl text-left normal-case tracking-normal animate-in fade-in">
                  <p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Spot History File</p>
                  {trick.spot_lat && trick.spot_lng ? (
                    <p className="font-mono text-[10px] text-neutral-500">
                      GPS: {Number(trick.spot_lat).toFixed(4)}, {Number(trick.spot_lng).toFixed(4)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-neutral-600">No telemetry recorded</p>
                  )}
                  <button
                    type="button"
                    onClick={function () { setShowRemovedInfo(false); }}
                    className="mt-2 w-full py-1 text-[11px] font-black uppercase tracking-wider text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-lg hover:text-red-400"
                  >
                    Close
                  </button>
                </div>
              )}
            </span>
          )}
        </div>

        {/* Focus Header Title & Description Section */}
        <div className="space-y-1 pl-0.5">
          <div className="text-white text-base font-black tracking-tight uppercase drop-shadow-md">
            {trick.trick_name}
          </div>
          
          {trick.caption && (
            <p className="text-sm text-neutral-200 font-medium leading-relaxed line-clamp-3 break-words drop-shadow">
              {trick.caption}
            </p>
          )}
        </div>

        {/* Interconnected Skater User Handles Map Tethers */}
        {trick.tagged_users && trick.tagged_users.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5 pl-0.5">
            {trick.tagged_users.map(function (u) {
              return (
                <Link 
                  key={u} 
                  to={`/skater/${u}`} 
                  className="text-[11px] font-bold text-[#00D2FF] hover:text-[#D2FF00] transition-colors"
                >
                  @{u}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

export default TrickCard;