import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Pencil, Camera, MessageCircle, AlertCircle, MapPin } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

const DECK_BRANDS = ["Baker","Element","Girl","Almost","Flip","Zero","Toy Machine","Anti Hero","Real","Santa Cruz","Powell Peralta","Enjoi"];

const calcAge = (b) => {
  if (!b) return null;
  const n = Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return Number.isFinite(n) ? n : null;
};

export default function MyProfile({ user, api, fetchUser, logout }) {
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
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

  return (
    <div className="min-h-screen bg-black text-white pb-24 selection:bg-[#D2FF00] selection:text-black">
      {/* Immersive Social Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-neutral-900">
        <span className="font-black tracking-tight text-sm lowercase">@{user.username}</span>
        <span className="font-extrabold text-[10px] uppercase tracking-widest text-neutral-500">My Basecamp</span>
      </header>

      <div className="px-4 pt-6 pb-4 space-y-6 max-w-md mx-auto">
        {/* Profile Avatar Card Grid */}
        <div className="flex items-center justify-between gap-6">
          {/* Brand Core Animated Pulsing Profile Border */}
          <div className="relative shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D2FF00] to-yellow-300 rounded-full p-[2px] animate-pulse" />
            <button 
              onClick={() => fileRef.current?.click()} 
              className="relative w-20 h-20 rounded-full overflow-hidden p-[2px] bg-black flex items-center justify-center active:opacity-80 transition-opacity"
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
              onClick={() => fileRef.current?.click()}
              className="w-full h-9 rounded-xl border border-neutral-800 bg-black text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Camera size={12} /> Shift Image
            </button>
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

        {/* feedback + logout */}
        <div className="pt-4 border-t border-neutral-900 space-y-3">
          <FeedbackButton />
          <button onClick={logout}
            className="w-full h-11 rounded-xl border border-neutral-950 bg-neutral-950/40 text-[#FF3366] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <LogOut size={12} /> LOG OUT
          </button>
        </div>
      </div>
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

