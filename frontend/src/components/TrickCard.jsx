import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from './ui/sonner';
import { MapPin, Trash2, Volume2, VolumeX, Flag, MessageCircle, Bookmark, MoreHorizontal, Flame, Loader2 } from 'lucide-react';
import ReportBlockSheet from './ReportBlockSheet';
import TrickComments, { timeAgo } from './TrickComments';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Instagram-style post: header, square clip, action row, then meta + comments under the video.
function TrickCard({ trick, currentUsername, tippedByMe, savedByMe, onTipped, onSaved, onDeleted, rank, periodLabel }) {
  const [tips, setTips] = useState(Number(trick.tips_received) || 0);
  const [tipped, setTipped] = useState(tippedByMe);
  const [tipping, setTipping] = useState(false);
  const [saved, setSaved] = useState(savedByMe);
  const [saving, setSaving] = useState(false);
  const [commentsCount, setCommentsCount] = useState(trick.comments_count || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [muted, setMuted] = useState(true);
  const [holding, setHolding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const videoRef = useRef(null);
  const pressTimer = useRef(null);
  const held = useRef(false);

  useEffect(() => { setTipped(tippedByMe); }, [tippedByMe]);
  useEffect(() => { setSaved(savedByMe); }, [savedByMe]);

  // Play only while on screen
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) v.play().catch(() => {}); else v.pause(); },
      { threshold: 0.6 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const isOwn = currentUsername && currentUsername === trick.user_id;

  const tip = async () => {
    if (tipping || tipped || isOwn) return;
    setTipping(true);
    try {
      const res = await api.post(`/tricks/${trick.id}/tip`);
      setTips(res.data.new_tips_total);
      setTipped(true);
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      onTipped?.(trick.id);
      toast.success('Hyped +1 DFQ 🔥');
    } catch (e) {
      const msg = e.response?.data?.detail || 'Hype failed';
      if (String(msg).toLowerCase().includes('already')) setTipped(true);
      toast.error(msg);
    } finally {
      setTipping(false);
    }
  };

  const toggleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/tricks/${trick.id}/save`);
      setSaved(res.data.saved);
      onSaved?.(trick.id, res.data.saved);
      toast.success(res.data.saved ? 'Saved' : 'Removed from saved');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this trick?')) return;
    try {
      await api.delete(`/tricks/${trick.id}`);
      toast.success('Trick removed');
      onDeleted?.(trick.id);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  // Tap = mute/unmute, hold = pause (pointer events: one handler for touch + mouse)
  const onPressStart = () => {
    held.current = false;
    pressTimer.current = setTimeout(() => {
      held.current = true;
      videoRef.current?.pause();
      setHolding(true);
    }, 200);
  };
  const onPressEnd = () => {
    clearTimeout(pressTimer.current);
    if (held.current) {
      videoRef.current?.play().catch(() => {});
      setHolding(false);
      held.current = false;
    } else {
      setMuted((m) => !m);
    }
  };
  const onPressCancel = () => {
    clearTimeout(pressTimer.current);
    if (held.current) {
      videoRef.current?.play().catch(() => {});
      setHolding(false);
      held.current = false;
    }
  };

  return (
    <article data-testid={`trick-card-${trick.id}`} className="bg-black border-b border-neutral-900 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link to={`/skater/${trick.user_id}`} className="shrink-0 p-[2px] rounded-full bg-gradient-to-tr from-[#D2FF00] to-[#FF3366]">
            <span className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-xs font-black uppercase text-white">
              {trick.user_id?.[0]}
            </span>
          </Link>
          <div className="min-w-0 leading-tight">
            <Link to={`/skater/${trick.user_id}`} data-testid={`trick-user-${trick.id}`} className="block text-sm font-bold text-white truncate">
              {trick.user_id}
            </Link>
            {trick.spot_id && !trick.spot_removed ? (
              <Link to={`/spots?focus=${trick.spot_id}`} data-testid={`trick-spot-${trick.id}`} className="flex items-center gap-1 text-[11px] text-[#D2FF00] truncate">
                <MapPin size={10} className="shrink-0" /> <span className="truncate">{trick.spot_name || 'Unknown spot'}</span>
              </Link>
            ) : (
              <span className="text-[11px] text-neutral-500">{trick.spot_name || 'Spot removed'}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          {rank && (
            <span data-testid={`trick-rank-${trick.id}`} className={`px-2 h-6 inline-flex items-center rounded-full text-[11px] font-black ${rank <= 3 ? 'bg-[#D2FF00] text-black' : 'bg-neutral-900 text-neutral-400'}`}>
              #{rank}
            </span>
          )}
          <button onClick={() => setMenuOpen((o) => !o)} data-testid={`trick-menu-${trick.id}`} aria-label="More"
            className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white">
            <MoreHorizontal size={20} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-30 w-44 bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
              {isOwn ? (
                <button onClick={remove} data-testid={`trick-delete-${trick.id}`} className="w-full flex items-center gap-2 px-4 h-11 text-sm text-[#FF3366] hover:bg-neutral-900">
                  <Trash2 size={14} /> Delete trick
                </button>
              ) : (
                <button onClick={() => { setMenuOpen(false); setReportOpen(true); }} data-testid={`trick-report-${trick.id}`} className="w-full flex items-center gap-2 px-4 h-11 text-sm text-neutral-200 hover:bg-neutral-900">
                  <Flag size={14} /> Report or block
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video */}
      <div
        className="relative w-full aspect-square bg-neutral-950 overflow-hidden select-none"
        style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
        onPointerDown={onPressStart}
        onPointerUp={onPressEnd}
        onPointerLeave={onPressCancel}
        onPointerCancel={onPressCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <video ref={videoRef} src={trick.video_url} loop muted={muted} playsInline preload="metadata" className="w-full h-full object-cover" />
        {holding && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="bg-black/60 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest text-neutral-300">Paused</span>
          </div>
        )}
        {burst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Flame size={96} className="text-[#D2FF00] fill-[#D2FF00] animate-ping" />
          </div>
        )}
        <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center pointer-events-none">
          {muted ? <VolumeX size={14} className="text-neutral-300" /> : <Volume2 size={14} className="text-[#D2FF00]" />}
        </span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 px-1.5 pt-1.5">
        <button
          onClick={tip}
          disabled={tipping || tipped || isOwn}
          data-testid={`trick-tip-${trick.id}`}
          aria-label="Hype with 1 DFQ"
          className={`h-11 px-2.5 flex items-center gap-1.5 rounded-full active:scale-90 transition-transform ${tipped ? 'text-[#D2FF00]' : isOwn ? 'text-neutral-700' : 'text-white'}`}
        >
          {tipping ? <Loader2 size={24} className="animate-spin" /> : <Flame size={24} className={tipped ? 'fill-[#D2FF00]' : ''} />}
          {!tipped && !isOwn && <span className="text-[11px] font-bold text-neutral-400">1 DFQ</span>}
        </button>
        <button onClick={() => setCommentsOpen(true)} data-testid={`trick-comments-${trick.id}`} aria-label="Comments"
          className="w-11 h-11 flex items-center justify-center text-white active:scale-90 transition-transform">
          <MessageCircle size={24} />
        </button>
        <button onClick={toggleSave} disabled={saving} data-testid={`trick-save-${trick.id}`} aria-label={saved ? 'Unsave' : 'Save'}
          className={`ml-auto w-11 h-11 flex items-center justify-center active:scale-90 transition-transform ${saved ? 'text-[#D2FF00]' : 'text-white'}`}>
          <Bookmark size={24} className={saved ? 'fill-[#D2FF00]' : ''} />
        </button>
      </div>

      {/* Meta */}
      <div className="px-3 space-y-1">
        <p data-testid={`trick-tips-total-${trick.id}`} className="text-sm font-bold text-white">
          {tips} DFQ hype
          {periodLabel && trick.period_tips > 0 && (
            <span className="ml-2 text-[11px] font-bold text-[#D2FF00]">+{trick.period_tips} {periodLabel}</span>
          )}
        </p>
        <p className="text-sm text-neutral-200 break-words">
          <Link to={`/skater/${trick.user_id}`} className="font-bold text-white mr-1.5">{trick.user_id}</Link>
          <span className="font-black uppercase tracking-tight text-[#D2FF00] mr-1.5">{trick.trick_name}</span>
          {trick.caption}
        </p>
        {trick.tagged_users?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {trick.tagged_users.map((u) => (
              <Link key={u} to={`/skater/${u}`} className="text-xs font-bold text-[#00D2FF]">@{u}</Link>
            ))}
          </div>
        )}
        <button onClick={() => setCommentsOpen(true)} data-testid={`trick-view-comments-${trick.id}`} className="block text-sm text-neutral-500">
          {commentsCount > 0 ? `View all ${commentsCount} comment${commentsCount === 1 ? '' : 's'}` : 'Add a comment...'}
        </button>
        <span className="block text-[10px] uppercase tracking-wider text-neutral-600">{timeAgo(trick.created_at)}</span>
      </div>

      <TrickComments open={commentsOpen} onClose={() => setCommentsOpen(false)} trick={trick}
        currentUsername={currentUsername} onCountChange={setCommentsCount} />
      <ReportBlockSheet open={reportOpen} onClose={() => setReportOpen(false)}
        contentType="trick" contentId={trick.id} ownerUsername={trick.user_id}
        onHidden={() => onDeleted?.(trick.id)} />
    </article>
  );
}

export default TrickCard;