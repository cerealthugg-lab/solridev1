import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Play, MapPin, Trash2, Coins, Sparkles, Award, Flame } from 'lucide-react';
import { toast } from 'sonner';
import TrickCard from './TrickCard';
import SLSProCardModal, { calculateSkaterLevel } from './SLSProCardModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const authHdr = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
const calcAge = (b) => { const n = b ? Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 864e5)) : null; return Number.isFinite(n) ? n : null; };

export default function SkaterProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [tricks, setTricks] = useState([]);
  const [active, setActive] = useState(null);
  const [slsOpen, setSlsOpen] = useState(false);
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
  const { level, progress, remainingForNext, isMax, rankTitle } = calculateSkaterLevel(tricks.length);

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24 lg:min-h-0 lg:bg-transparent lg:pb-0 selection:bg-[#D2FF00] selection:text-black">
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

      {/* Main 2-Column Responsive Layout */}
      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-x-10 lg:items-start">
        {/* Left column / aside */}
        <aside className="space-y-5 lg:col-start-1 lg:row-start-1 lg:bg-neutral-950/80 lg:border lg:border-neutral-900 lg:rounded-3xl lg:p-6 lg:backdrop-blur-sm shadow-xl" data-testid="skater-info-panel">
          {/* Avatar & Counts Matrix */}
          <div className="flex items-center justify-between gap-6">
            {/* Pulsing Avatar */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-[#D2FF00] rounded-full p-[2px] animate-pulse" />
              <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden p-[2px] bg-black flex items-center justify-center">
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

          {/* 🏆 SLS Level & Card Progress Engine */}
          <div 
            onClick={() => setSlsOpen(true)}
            className="p-3.5 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-neutral-800 hover:border-[#D2FF00]/50 rounded-2xl cursor-pointer transition-all duration-300 group select-none shadow-lg relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#D2FF00]/5 rounded-full blur-2xl group-hover:bg-[#D2FF00]/10 transition-colors pointer-events-none" />
            
            <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#D2FF00] text-black shadow-sm">
                  LVL {level}
                </span>
                <span className="text-xs font-black uppercase tracking-tight text-white group-hover:text-[#D2FF00] transition-colors truncate">
                  {rankTitle}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#D2FF00] flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform">
                <Sparkles size={11} /> SLS Card →
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden p-[1px] border border-neutral-800/80 relative z-10">
              <div 
                className="h-full bg-gradient-to-r from-[#D2FF00] to-yellow-300 rounded-full transition-all duration-500 shadow-[0_0_10px_#D2FF00]" 
                style={{ width: `${progress}%` }} 
              />
            </div>

            <div className="flex justify-between items-center text-[9px] font-mono text-neutral-400 mt-2 relative z-10">
              <span>{tricks.length} / 100 clips</span>
              <span className="text-[#D2FF00] font-bold">{isMax ? 'MAX LEVEL' : `${remainingForNext} to next LVL`}</span>
            </div>
          </div>

          {/* Username & Bio Description */}
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">{profile.username}</h1>
            {profile.full_name && <p className="text-neutral-400 text-xs font-medium tracking-wide mt-0.5">{profile.full_name}</p>}
            {profile.self_comment && (
              <p className="text-sm text-neutral-300 font-medium mt-2 leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-900/60">
                "{profile.self_comment}"
              </p>
            )}
          </div>

          {/* Skate Setup Hardware Tags */}
          <div className="flex flex-wrap gap-1.5">
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
          <button 
            onClick={startDM} 
            className="w-full h-11 bg-[#D2FF00] text-black font-extrabold uppercase tracking-widest text-xs rounded-xl active:scale-[0.98] transition-all shadow-md"
          >
            Message Skater
          </button>
        </aside>

        {/* Right column / section: Clips gallery */}
        <section className="lg:col-start-2 lg:row-start-1 -mx-4 lg:mx-0">
          <div className="px-5 lg:px-1 pb-2 border-b border-neutral-900/60 flex items-center gap-2 text-[10px] lg:text-xs font-black uppercase tracking-widest mt-6 lg:mt-0 shrink-0 select-none">
            <Play size={12} className="text-[#D2FF00] fill-[#D2FF00]" />
            <span className="text-white">Trick Vault ({tricks.length})</span>
          </div>

          {tricks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center select-none lg:rounded-2xl lg:border lg:border-dashed lg:border-neutral-800 mt-4">
              <p className="text-xs font-black text-neutral-600 uppercase tracking-widest">
                No clips dropped yet
              </p>
            </div>
          ) : (
            /* Responsive Modern Media Grid */
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-[2px] sm:gap-3 bg-neutral-950 w-full mt-2">
              {tricks.map((t, i) => (
                <button 
                  key={t.id} 
                  onClick={() => setActive(i)} 
                  className="aspect-square bg-neutral-900 relative group overflow-hidden border border-neutral-900/60 sm:rounded-2xl active:scale-95 hover:border-[#D2FF00]/40 transition-all shadow-md"
                  title={t.description || t.trick_name || "Skate clip"}
                >
                  {/* Fallback poster while video loads */}
                  <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                    <span className="text-lg opacity-25 mb-0.5">🛹</span>
                    <span className="text-[8px] font-black uppercase text-neutral-500 truncate max-w-full tracking-tight">{t.trick_name || 'Clip'}</span>
                  </div>

                  {/* 🎬 Video Asset Thumbnail */}
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
                  
                  {/* Ambient bottom protection vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none z-10" />

                  {/* Glowing M2E Token Yield Value Badge */}
                  <span className="absolute bottom-2 left-2 text-[9px] text-white font-black bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-[#D2FF00]/10 flex items-center gap-1 shadow-md z-20 group-hover:border-[#D2FF00]/40 transition-colors">
                    <span className="text-[#D2FF00]">▶</span> {t.tips_received ?? 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <SLSProCardModal
        open={slsOpen}
        onClose={() => setSlsOpen(false)}
        user={profile}
        tricksCount={tricks.length}
        isOwn={false}
      />

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