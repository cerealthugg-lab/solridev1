import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Play } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const authHdr = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const calcAge = (b) => { const n = b ? Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 864e5)) : null; return Number.isFinite(n) ? n : null; };

export default function SkaterProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tricks, setTricks] = useState([]);
  const [active, setActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/users/${username}/public`, authHdr())
      .then(r => setProfile(r.data)).catch(() => setError("Skater not found")).finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/tricks/user/${username}`, authHdr())
      .then(r => setTricks(r.data || [])).catch(() => {});
  }, [username]);

  const startDM = () =>
    axios.post(`${BACKEND_URL}/api/conversations`, { username }, authHdr())
      .then(r => navigate('/messages/' + r.data.id, { state: { other: username } }))
      .catch(() => toast.error("Couldn't open chat"));
  const blockUser = () => axios.post(`${BACKEND_URL}/api/blocks`, { username }, authHdr()).then(() => toast("User blocked")).catch(() => {});
  const reportUser = () => axios.post(`${BACKEND_URL}/api/dm/report`, { reported_user: username }, authHdr()).then(() => toast("Reported — thanks")).catch(() => {});

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-neutral-800 border-t-[#D2FF00] rounded-full animate-spin" />
    </div>
  );
  if (error || !profile) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-xs font-bold uppercase tracking-widest">
      {error || "Skater not found"}
    </div>
  );

  const a = calcAge(profile.birth_date);

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Immersive Social Style Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-neutral-900">
        <button onClick={() => navigate(-1)} className="p-1 text-neutral-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <span className="font-black tracking-tight text-sm lowercase">@{profile.username}</span>
        <div className="flex gap-4">
          <button onClick={reportUser} className="text-xs font-bold text-red-500 uppercase tracking-wider">Report</button>
          <button onClick={blockUser} className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Block</button>
        </div>
      </header>

      {/* Profile Bio Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between gap-6">
          {/* Instagram-style Avatar with Pulse Ring */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-[#D2FF00] rounded-full p-[2px] animate-pulse" />
            <div className="relative w-20 h-20 rounded-full overflow-hidden p-[2px] bg-black flex items-center justify-center">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={profile.username} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-black text-[#D2FF00]">
                  {profile.username ? profile.username[0].toUpperCase() : 'S'}
                </span>
              )}
            </div>
          </div>

          {/* Social Counts Matrix */}
          <div className="flex-1 grid grid-cols-3 gap-1 text-center">
            <div>
              <div className="text-xl font-black text-white">{profile.spot_count ?? 0}</div>
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Spots</div>
            </div>
            <div>
              <div className="text-xl font-black text-white">{profile.ride_count ?? 0}</div>
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Rides</div>
            </div>
            <div>
              <div className="text-xl font-black text-white">{tricks.length}</div>
              <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mt-0.5">Tricks</div>
            </div>
          </div>
        </div>

        {/* Username & Bio Description */}
        <div className="mt-4">
          <h1 className="text-xl font-black tracking-tight uppercase">{profile.username}</h1>
          {profile.self_comment && (
            <p className="text-sm text-neutral-300 font-medium mt-1 leading-relaxed">"{profile.self_comment}"</p>
          )}
        </div>

        {/* Skate Setup Hardware Tags */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {profile.deck_company && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
              🛹 {profile.deck_company} {profile.deck_size ? `(${profile.deck_size})` : ''}
            </span>
          )}
          {profile.fav_trick && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
              🎯 {profile.fav_trick}
            </span>
          )}
          {profile.fav_spot && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#D2FF00]/10 border border-[#D2FF00]/20 text-[#D2FF00] px-2.5 py-1 rounded-full">
              📍 {profile.fav_spot}
            </span>
          )}
          {a != null && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full">
              Age · {a}
            </span>
          )}
        </div>

        {/* Premium Action Button */}
        <div className="mt-5">
          <button onClick={startDM} className="w-full h-11 bg-[#D2FF00] text-black font-extrabold uppercase tracking-widest text-xs rounded-xl active:scale-[0.98] transition-all">
            Message Skater
          </button>
        </div>
      </div>

      {/* Edge-to-Edge Instagram Style Clip Gallery Grid */}
      <div className="border-t border-neutral-900 mt-4">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-900/60">
          <Play size={12} className="text-[#D2FF00] fill-[#D2FF00]" />
          <h2 className="text-xs font-black uppercase tracking-widest text-neutral-400">Trick Vault</h2>
        </div>

                {tricks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <p className="text-xs font-black text-neutral-600 uppercase tracking-widest">
              No clips dropped yet
            </p>
          </div>
        ) : (
          /* 📱 PREMIUM IMMERSIVE 3-COLUMN SOCIAL GRID */
          <div className="grid grid-cols-3 gap-[2px] bg-neutral-950 p-[2px] rounded-2xl overflow-hidden border border-neutral-900/40 shadow-inner">
            {tricks.map((t, i) => (
              <button 
                key={t.id} 
                onClick={() => setActive(i)} 
                className="relative aspect-square bg-neutral-900 overflow-hidden active:scale-95 transition-all duration-200 group border border-neutral-950/20"
                title={t.description || t.trick_name || "Skate clip"}
              >
                {/* 🎬 Immersive Video Asset Thumbnail with Defensive Fallback Paths */}
                <video 
                  src={t.video_url || t.clip_url || t.url} 
                  muted 
                  playsInline 
                  preload="metadata" 
                  className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none"
                  poster={t.thumbnail_url || t.cover_photo || ""}
                />
                
                {/* Ambient dark bottom protection vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none z-10" />
                
                {/* 🏷️ Micro Info Row Overlay: Shows Trick Title / Caption snippet if available */}
                {(t.trick_name || t.description || t.caption) && (
                  <div className="absolute top-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-left pointer-events-none z-20 hidden sm:block">
                    <p className="text-[8px] font-black uppercase text-[#D2FF00] truncate tracking-tight drop-shadow-md">
                      {t.trick_name || "Clip"}
                    </p>
                    <p className="text-[7px] text-white truncate max-w-full font-medium drop-shadow-sm">
                      {t.description || t.caption}
                    </p>
                  </div>
                )}

                {/* 💰 Glowing M2E Token Yield Value Badge */}
                <span className="absolute bottom-2 left-2 text-[9px] text-white font-black bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-[#D2FF00]/10 flex items-center gap-1 shadow-md z-20 group-hover:border-[#D2FF00]/40 transition-colors">
                  <span className="text-[#D2FF00]">▶</span> {t.tips_received ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}

      </div>

      {active !== null && <TrickFeedViewer tricks={tricks} startIndex={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function TrickFeedViewer({ tricks, startIndex, onClose }) {
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
  }, [startIndex]);
  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-black overflow-y-auto snap-y snap-mandatory">
      <button onClick={onClose} className="fixed top-4 right-4 z-20 text-white text-3xl font-light bg-black/40 backdrop-blur-md w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform">×</button>
      {tricks.map((t) => <TrickSlide key={t.id} trick={t} />)}
    </div>
  );
}

function TrickSlide({ trick }) {
  const vref = useRef(null);
  const holdTimer = useRef(null);
  const held = useRef(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play?.().catch(() => {}); else v.pause?.();
    }, { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const down = () => { held.current = false; holdTimer.current = setTimeout(() => { held.current = true; vref.current?.pause(); }, 200); };
  const up = () => { clearTimeout(holdTimer.current); if (held.current) vref.current?.play?.().catch(() => {}); else setMuted((m) => !m); };

  return (
    <div onMouseDown={down} onMouseUp={up} onTouchStart={down} onTouchEnd={up} className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center">
      <video ref={vref} src={trick.video_url} loop muted={muted} playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-6 left-4 right-16 z-10 pointer-events-none drop-shadow-md">
        <p className="text-sm font-black uppercase tracking-wider text-[#D2FF00]">⚡ {trick.tips_received ?? 0} Tips</p>
        <p className="text-xs text-white/80 mt-1">{trick.description || "Skate session upload"}</p>
      </div>
    </div>
  );
}
