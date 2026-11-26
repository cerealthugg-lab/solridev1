import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Play, MapPin, Trash2, Coins } from 'lucide-react';
import { toast } from 'sonner';
import TrickCard from './TrickCard';



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
    window.scrollTo(0, 0);
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
    <div className="min-h-screen bg-[#09090b] text-white pb-24">
      {/* Immersive Social Style Header */}
      <header 
        className="sticky top-0 z-40 flex items-center justify-between px-5 pb-3.5 bg-[#09090b]/95 backdrop-blur-md border-b border-neutral-900"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
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
                {/* Fallback poster while video loads */}
                <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                  <span className="text-lg opacity-25 mb-0.5">🛹</span>
                  <span className="text-[8px] font-black uppercase text-neutral-500 truncate max-w-full tracking-tight">{t.trick_name || 'Clip'}</span>
                </div>

                {/* 🎬 Immersive Video Asset Thumbnail with Defensive Fallback Paths */}
                <video 
                  src={(t.video_url || t.clip_url || t.url) + '#t=0.001'} 
                  muted 
                  playsInline 
                  preload="auto" 
                  className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none relative z-10"
                  poster={t.thumbnail_url || t.cover_photo || ""}
                  onLoadedMetadata={(e) => {
                    try { e.target.currentTime = 0.001; } catch (_) {}
                  }}
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

      {active !== null && <ProfileFeedViewer tricks={tricks} startIndex={active} onClose={() => setActive(null)} currentUsername={null} />}
    </div>
  );
}

function ProfileFeedViewer({ tricks, startIndex, onClose, currentUsername }) {
  const containerRef = React.useRef(null);
  const [tippedIds, setTippedIds] = React.useState(new Set());
  const [savedIds, setSavedIds] = React.useState(new Set());

  // Jump to clicked clip
  React.useEffect(() => {
    setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const slides = el.querySelectorAll('[data-slide]');
      if (slides[startIndex]) slides[startIndex].scrollIntoView({ behavior: 'instant' });
    }, 30);
  }, [startIndex]);

  // Swipe-down at bottom = close
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startY = 0;
    const onStart = (e) => { startY = (e.touches || e.changedTouches)[0].clientY; };
    const onEnd = (e) => {
      const endY = (e.changedTouches || e.touches)[0]?.clientY ?? startY;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (atBottom && endY < startY - 40) onClose();
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
  }, [onClose]);

  const handleTipped = (id) => setTippedIds((p) => new Set(p).add(id));
  const handleSaved = (id, saved) => setSavedIds((p) => { const n = new Set(p); if (saved) n.add(id); else n.delete(id); return n; });

  return (
    <div ref={containerRef} className="fixed inset-0 z-[9999] bg-[#09090b] overflow-y-auto overscroll-contain w-full h-[100dvh]">
            {/* sticky mini header with proper safe area clearance */}
      <div 
        className="sticky top-0 z-20 flex items-center gap-3 px-4 pb-3 bg-[#09090b] border-b border-neutral-900 shadow-lg"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 active:scale-90 transition-transform bg-neutral-900/60 border border-neutral-800">
          ✕
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-white">Clips</span>
      </div>

      {tricks.map((trick) => (
        <div key={trick.id} data-slide>
          <TrickCard
            trick={trick}
            currentUsername={currentUsername}
            tippedByMe={tippedIds.has(trick.id)}
            savedByMe={savedIds.has(trick.id)}
            onTipped={handleTipped}
            onSaved={handleSaved}
            onDeleted={onClose}
          />
        </div>
      ))}

      {/* bottom close hint — swipe down here closes */}
      <div className="flex flex-col items-center gap-2 py-12 select-none">
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-700">swipe down to close</span>
        <span className="text-neutral-800 text-lg">↓</span>
      </div>
    </div>
  );
}