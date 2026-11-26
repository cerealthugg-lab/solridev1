import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Pencil, Camera, MessageCircle, AlertCircle, MapPin, Settings, Shield, FileText, X, Trash2, Sparkles, Award, Flame } from "lucide-react";
import FeedbackModal from "./FeedbackModal";
import TrickCard from "./TrickCard";
import SLSProCardModal, { calculateSkaterLevel } from "./SLSProCardModal";

const DECK_BRANDS = ["Baker","Element","Girl","Almost","Flip","Zero","Toy Machine","Anti Hero","Real","Santa Cruz","Powell Peralta","Enjoi"];

const calcAge = (b) => {
  if (!b) return null;
  const n = Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Number.isFinite(n) ? n : null;
};

export default function MyProfile({ user, api, fetchUser, logout }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slsOpen, setSlsOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [activeTab, setActiveTab] = useState('clips'); // 'clips' or 'saved'
  const [tricks, setTricks] = useState([]);
  const [savedTricks, setSavedTricks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", deck_size: "", deck_company: "", fav_trick: "", fav_spot: "", self_comment: "", birth_date: "",
  });

  useEffect(() => {
    if (user) setForm({
      full_name: user.full_name || "", deck_size: user.deck_size || "", deck_company: user.deck_company || "",
      fav_trick: user.fav_trick || "", fav_spot: user.fav_spot || "", self_comment: user.self_comment || "",
      birth_date: user.birth_date || "",
    });
  }, [user]);

  const fetchSavedTricks = () => {
    api.get('/tricks/saved/list')
      .then(r => setSavedTricks(r.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user?.username) return;
    api.get(`/tricks/user/${user.username}`)
     .then(r => setTricks(r.data || []))
     .catch(() => {});
    fetchSavedTricks();
  }, [user?.username]);


  if (!user) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const uploadPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append("photo", f);
    try { await api.post("/users/me/photo", fd); await fetchUser(); } catch {}
  };

  const save = async () => {
    setSaving(true);
    try { await api.put("/users/me", form); await fetchUser(); setEditing(false); }
    catch {} finally { setSaving(false); }
  };

  const a = calcAge(user.birth_date);
  const { level, progress, remainingForNext, isMax, rankTitle } = calculateSkaterLevel(tricks.length);

  return (
    <div className="min-h-screen bg-[#09090b] text-white pb-24 lg:min-h-0 lg:bg-transparent lg:pb-0 selection:bg-[#D2FF00] selection:text-black" data-testid="my-profile">
      {/* Immersive Social Top Navigation Bar (phone only) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-5 pb-3.5 bg-[#09090b]/90 backdrop-blur-md border-b border-neutral-900" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)' }}>
        <span className="font-black tracking-tight text-lg text-white">@{user.username}</span>
        <span className="font-extrabold text-[11px] uppercase tracking-widest text-neutral-400">My Basecamp</span>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-x-10 lg:items-start">
        {/* Left column on laptop: profile info */}
        <aside className="space-y-5 lg:col-start-1 lg:row-start-1 lg:bg-neutral-950/80 lg:border lg:border-neutral-900 lg:rounded-3xl lg:p-6 lg:backdrop-blur-sm shadow-xl" data-testid="profile-info-panel">
        {/* Profile Avatar Card Grid */}
        <div className="flex items-center justify-between gap-6">
          {/* Brand Core Animated Pulsing Profile Border */}
          <div className="relative shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D2FF00] to-yellow-300 rounded-full p-[2px] animate-pulse" />
            <button 
              onClick={() => fileRef.current?.click()} 
              className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden p-[2px] bg-black flex items-center justify-center active:opacity-80 transition-opacity"
            >
              {user.photo_url ? (
                <img src={user.photo_url} alt={user.username} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-2xl font-black text-[#D2FF00]">{user.username?.[0]?.toUpperCase()}</span>
              )}
              {/* Overlay camera prompt hint */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          </div>

          {/* Social Profile Layout Controls */}
          <div className="flex-1 flex flex-col gap-1.5">
            <button 
              onClick={() => setEditing((v) => !v)}
              className="w-full h-9 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Pencil size={12} className={editing ? "text-[#FF3366]" : "text-[#D2FF00]"} />
              {editing ? "Close Editor" : "Edit Info"}
            </button>
            <button 
              onClick={() => setSettingsOpen(true)}
              className="w-full h-9 rounded-xl border border-neutral-800 bg-neutral-900/60 text-xs font-bold uppercase tracking-widest text-neutral-300 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Settings size={12} className="text-neutral-400" /> Settings
            </button>
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
              <Sparkles size={11} /> SLS Card {isMax ? 'Unlocked' : ''} →
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
            <span>{tricks.length} / 100 clips to Lvl 10 Pro</span>
            <span className="text-[#D2FF00] font-bold">{isMax ? 'MAX LEVEL' : `${remainingForNext} to next LVL`}</span>
          </div>
        </div>

        {/* Brand Meta Identifier Text */}
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase">{user.username}</h1>
          {user.full_name && <p className="text-neutral-400 text-xs font-medium tracking-wide mt-0.5">{user.full_name}</p>}
        </div>

        {/* READ ONLY MODE AESTHETIC */}
        {!editing && (
          <div className="space-y-5">
            {/* Inline Capsule Hardware Badges */}
            <div className="flex flex-wrap gap-1.5">
              {user.deck_company && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                  Setup: {user.deck_company} {user.deck_size ? `(${user.deck_size}")` : ''}
                </span>
              )}
              {user.fav_trick && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-1 rounded-full">
                  Fav. trick: {user.fav_trick}
                </span>
              )}
              {user.fav_spot && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#D2FF00]/10 border border-[#D2FF00]/20 text-[#D2FF00] px-2.5 py-1 rounded-full">
                  Fav. spot: 📍 {user.fav_spot}
                </span>
              )}
              {a != null && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-400 px-2.5 py-1 rounded-full">
                  Age · {a}
                </span>
              )}
            </div>

            {user.self_comment ? (
              <p className="text-sm text-neutral-300 font-medium leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-900/60">
                "{user.self_comment}"
              </p>
            ) : (
              <p className="text-xs font-medium text-neutral-600 uppercase tracking-widest text-center py-2">
                No bio added yet. Tap edit to update your file.
              </p>
            )}
          </div>
        )}

        {/* EDITING FORM INPUT PANEL AESTHETIC */}
        {editing && (
          <div className="space-y-4 bg-neutral-950 p-4 border border-neutral-900 rounded-2xl animate-fadeIn">
            <Field label="Skater Full Name" value={form.full_name} onChange={set("full_name")} placeholder="Tony Alva" />
            <Field label="Birth Date" type="date" value={form.birth_date} onChange={set("birth_date")} />
            
            <div className="grid grid-cols-2 gap-3">
              <Field label="Deck Width" value={form.deck_size} onChange={set("deck_size")} placeholder="8.25" />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Deck Brand</label>
                <input 
                  list="deck-brands" 
                  value={form.deck_company} 
                  onChange={set("deck_company")}
                  className="w-full h-10 px-3 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:border-[#D2FF00] focus:outline-none transition-colors" 
                  placeholder="Baker" 
                />
                <datalist id="deck-brands">{DECK_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
              </div>
            </div>

            <Field label="Signature Trick" value={form.fav_trick} onChange={set("fav_trick")} placeholder="Tre Flip" />
            <Field label="Home Pro Spot" value={form.fav_spot} onChange={set("fav_spot")} placeholder="Venice Beach" />
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider flex justify-between">
                <span>About Session Note</span>
                <span className="font-mono text-neutral-600">{form.self_comment.length}/130</span>
              </label>
              <textarea 
                value={form.self_comment}
                onChange={(e) => e.target.value.length <= 130 && setForm({ ...form, self_comment: e.target.value })}
                maxLength={130}
                className="w-full h-20 bg-black border border-neutral-800 rounded-xl p-3 text-sm text-white resize-none focus:border-[#D2FF00] focus:outline-none transition-colors" 
                placeholder="Pushing concrete since day one..."
              />
            </div>
            
            <button 
              onClick={save} 
              disabled={saving}
              className="w-full h-11 bg-[#D2FF00] text-black font-extrabold uppercase tracking-widest text-xs rounded-xl flex items-center justify-center disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
            >
              {saving ? "Syncing Profile..." : "Save Setup Updates"}
            </button>
          </div>
        )}

        {/* Instagram style Messenger Link Box */}
        <Link 
          to="/messages"
          className="flex items-center justify-between px-4 h-14 bg-[#D2FF00]/5 border border-[#D2FF00]/20 rounded-xl active:bg-[#D2FF00]/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageCircle size={16} className="text-[#D2FF00]" />
            <span className="font-extrabold uppercase tracking-widest text-xs text-[#D2FF00]">Direct Messages Inbox</span>
          </div>
          <span className="text-[#D2FF00] font-black text-sm">→</span>
        </Link>
        </aside>

        {/* Right column on laptop: clips */}
        <section className="lg:col-start-2 lg:row-start-1 lg:row-span-2 -mx-4 lg:mx-0" data-testid="profile-clips-section">
          {/* INSTAGRAM-STYLE TRICK FEED MENU SEGMENTS */}
          <div className="px-5 lg:px-1 pb-2 border-b border-neutral-900/60 flex gap-6 text-[10px] lg:text-xs font-black uppercase tracking-widest mt-6 lg:mt-0 shrink-0 select-none">
            <button 
              onClick={() => setActiveTab('clips')} 
              className={`pb-2 transition-colors font-sans ${activeTab === 'clips' ? 'text-[#D2FF00] border-b-2 border-[#D2FF00]' : 'text-neutral-500 hover:text-white'}`}
            >
              My Clips ({tricks.length})
            </button>
            <button 
              onClick={() => { setActiveTab('saved'); fetchSavedTricks(); }} 
              className={`pb-2 transition-colors font-sans ${activeTab === 'saved' ? 'text-[#D2FF00] border-b-2 border-[#D2FF00]' : 'text-neutral-500 hover:text-white'}`}
            >
              Saved ({savedTricks.length})
            </button>
          </div>

          {/* TRUE 3-COLUMN SQUARE MEDIA POST GRID */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-[2px] sm:gap-3 bg-neutral-950 w-full">
            {(activeTab === 'clips' ? tricks : savedTricks).length > 0 ? (
              (activeTab === 'clips' ? tricks : savedTricks).map(function (trick, i) {
                return (
                  <button
                    key={trick.id}
                    onClick={() => setActive(i)}
                    className="aspect-square bg-neutral-900 relative group overflow-hidden border border-neutral-900/60 sm:rounded-2xl active:scale-95 hover:border-[#D2FF00]/40 transition-all shadow-md">
                    
                    {/* Fallback poster while video loads */}
                    <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                      <span className="text-lg opacity-25 mb-0.5">🛹</span>
                      <span className="text-[8px] font-black uppercase text-neutral-500 truncate max-w-full tracking-tight">{trick.trick_name || 'Trick'}</span>
                    </div>

                    <video 
                      src={trick.video_url + '#t=0.001'} 
                      className="w-full h-full object-cover pointer-events-none relative z-10"
                      preload="auto"
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        try { e.target.currentTime = 0.001; } catch (_) {}
                      }}
                    />
                    <div className="absolute bottom-2 left-2 z-20 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[9px] font-mono text-[#D2FF00] font-black border border-[#D2FF00]/10 flex items-center gap-1 shadow-lg">
                      ▶ {trick.tips_received || 0}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="col-span-3 sm:col-span-4 lg:col-span-4 flex flex-col items-center justify-center text-center p-12 text-neutral-600 space-y-2 select-none lg:rounded-2xl lg:border lg:border-dashed lg:border-neutral-800">
                <p className="text-[10px] font-black uppercase tracking-widest font-sans">
                  {activeTab === 'clips' ? 'No clips catalogued' : 'No saved clips'}
                </p>
                <p className="text-[11px] text-neutral-500 max-w-[200px] leading-relaxed normal-case">
                  {activeTab === 'clips' 
                    ? 'Hit the stream or local spots map to log your first session.'
                    : 'Tap the bookmark icon on any clip in the tricks feed to save it here.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          logout={logout}
          api={api}
          onShiftImage={() => { setSettingsOpen(false); fileRef.current?.click(); }}
        />

        <SLSProCardModal
          open={slsOpen}
          onClose={() => setSlsOpen(false)}
          user={user}
          tricksCount={tricks.length}
          isOwn={true}
        />
      </div>

      {active !== null && (
        <ProfileFeedViewer 
          tricks={activeTab === 'clips' ? tricks : savedTricks} 
          startIndex={active} 
          onClose={() => setActive(null)} 
          currentUsername={user?.username} 
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">{label}</label>
      <input {...props} value={value || ""} onChange={onChange}
        className="w-full h-10 px-3 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:border-[#D2FF00] focus:outline-none" />
    </div>
  );
}

function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-neutral-950 border border-neutral-900/60 rounded-xl hover:border-neutral-800 transition-colors text-left">
        <div className="flex items-center gap-3">
          <AlertCircle size={16} className="text-neutral-500" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-white">Send Tech Report</div>
            <div className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold mt-0.5">Bug · Lag · Idea · Anything</div>
          </div>
        </div>
        <span className="text-neutral-500 font-black text-sm">→</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
    
    function DeleteAccountButton({ api, logout }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmDelete = async () => {
    setBusy(true); setError("");
    try { await api.delete("/users/me", { data: { password } }); logout(); }
    catch (e) { setError(e.response?.data?.detail || "Couldn't delete account"); }
    finally { setBusy(false); }
  };
  return (<>
    <button onClick={() => setOpen(true)} className="w-full h-11 text-[10px] font-bold uppercase tracking-widest text-neutral-600">Delete account</button>
    {open && (
      <div className="fixed inset-0 z-[10000] flex items-end lg:items-center justify-center">
        <button aria-label="Close" className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
        <div className="relative w-full max-w-md bg-neutral-950 border-t lg:border border-neutral-800 rounded-t-3xl lg:rounded-3xl p-5 space-y-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
          <h3 className="text-sm font-black uppercase tracking-widest text-[#FF3366]">Delete account forever?</h3>
          <p className="text-xs text-neutral-400">This removes your profile, tricks and videos, spots and photos, messages, rides and DFQ points. It can't be undone.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
            className="w-full h-12 px-4 bg-black border border-neutral-800 rounded-xl text-white text-base focus:outline-none" />
          {error && <p className="text-xs text-[#FF3366]">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="flex-1 h-12 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase">Cancel</button>
            <button onClick={confirmDelete} disabled={busy || !password} className="flex-1 h-12 rounded-xl bg-[#FF3366] text-black text-xs font-black uppercase disabled:opacity-50">{busy ? "Deleting..." : "Delete"}</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function SettingsModal({ open, onClose, user, logout, api, onShiftImage }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:px-4 overflow-hidden">
        <button aria-label="Close settings" className="absolute inset-0 bg-transparent" onClick={onClose} />
        
        <div 
          className="w-full max-w-md bg-[#09090b] border border-neutral-800 rounded-t-3xl sm:rounded-3xl relative max-h-[90vh] overflow-y-auto shadow-2xl p-5 space-y-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#D2FF00]" />
              <h2 className="text-base font-black uppercase tracking-wider text-white">Settings</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {/* Shift Image */}
            <button
              onClick={onShiftImage}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-[#D2FF00]">
                  <Camera size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Shift Profile Photo</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Upload new avatar</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-white font-black text-sm">→</span>
            </button>

            {/* Send Tech Report */}
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-[#D2FF00]">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Send Tech Report</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Bug · Lag · Idea · Feedback</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-white font-black text-sm">→</span>
            </button>

            {/* Privacy Policy */}
            <Link
              to="/privacy"
              onClick={onClose}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-neutral-400">
                  <Shield size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Privacy Policy</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Data protection & permissions</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-white font-black text-sm">→</span>
            </Link>

            {/* Terms of Service */}
            <Link
              to="/terms"
              onClick={onClose}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-neutral-400">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Terms of Service</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Community guidelines & EULA</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-white font-black text-sm">→</span>
            </Link>

            {/* Log Out */}
            <button
              onClick={() => { onClose(); logout(); }}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-neutral-800 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-[#FF3366]">
                  <LogOut size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-white">Log Out</div>
                  <div className="text-[10px] text-neutral-500 font-medium">@{user.username}</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-white font-black text-sm">→</span>
            </button>

            {/* Delete Account */}
            <button
              onClick={() => setDeleteOpen(true)}
              className="w-full flex items-center justify-between p-3.5 bg-neutral-950 border border-neutral-900/80 rounded-xl hover:border-red-950/40 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF3366]/10 flex items-center justify-center text-[#FF3366]">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#FF3366]">Delete Account</div>
                  <div className="text-[10px] text-neutral-500 font-medium">Permanently wipe profile and data</div>
                </div>
              </div>
              <span className="text-neutral-500 group-hover:text-[#FF3366] font-black text-sm">→</span>
            </button>
          </div>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <DeleteAccountDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} api={api} logout={logout} />
    </>
  );
}

function DeleteAccountDialog({ open, onClose, api, logout }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const confirmDelete = async () => {
    setBusy(true); setError("");
    try { 
      await api.delete("/users/me", { data: { password } }); 
      logout(); 
    } catch (e) { 
      setError(e.response?.data?.detail || "Couldn't delete account"); 
    } finally { 
      setBusy(false); 
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:px-4">
      <button aria-label="Close" className="absolute inset-0 bg-transparent" onClick={onClose} />
      <div 
        className="relative w-full max-w-md bg-[#09090b] border border-neutral-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-black uppercase tracking-widest text-[#FF3366]">Delete account forever?</h3>
        <p className="text-xs text-neutral-400 leading-relaxed">This permanently deletes your clips, spots, messages, rides, and DFQ points. This cannot be undone.</p>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="Enter your password"
          className="w-full h-11 px-4 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#FF3366]" 
        />
        {error && <p className="text-xs text-[#FF3366]">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-wider">Cancel</button>
          <button onClick={confirmDelete} disabled={busy || !password} className="flex-1 h-11 rounded-xl bg-[#FF3366] text-black text-xs font-black uppercase tracking-wider disabled:opacity-50">
            {busy ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
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
        <div ref={containerRef} className="fixed inset-0 z-[10000] bg-[#09090b] overflow-y-auto overscroll-contain w-full h-[100dvh]">
      {/* sticky mini header with solid dark background under status bar */}
      <div 
        className="sticky top-0 z-20 flex items-center gap-3 px-4 pb-3 bg-[#09090b] border-b border-neutral-900 shadow-md"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)' }}
      >
        <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 active:scale-90 transition-transform bg-neutral-900 border border-neutral-800">
          ✕
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-white">Clips</span>
      </div>

      {tricks.map((trick, i) => (
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