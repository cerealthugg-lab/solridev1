import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Pencil, Camera } from "lucide-react";
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
  const f = e.target.files?.[0];
  if (!f) { alert("No file selected"); return; }
  const fd = new FormData();
  fd.append("photo", f);
  try {
    const r = await api.post("/users/me/photo", fd);
    alert("Upload OK → " + (r.data?.photo_url || "but NO url returned"));
    await fetchUser();
  } catch (err) {
    alert("Upload FAILED → " + (err.response?.status || "") + " " + (err.response?.data?.detail || err.message));
  }
};

  const save = async () => {
    setSaving(true);
    try { await api.put("/users/me", form); await fetchUser(); setEditing(false); }
    catch {} finally { setSaving(false); }
  };

  const a = calcAge(user.birth_date);
  const info = [
    ["Deck size", user.deck_size],
    ["Deck company", user.deck_company],
    ["Fav trick", user.fav_trick],
    ["Fav spot", user.fav_spot],
    ["Birth date", user.birth_date ? `${user.birth_date}${a != null ? ` · ${a} y.o.` : ""}` : null],
  ].filter(([, v]) => v);

  return (
    <div className="max-w-md mx-auto p-4 text-white space-y-6">
      {/* header: avatar left, buttons right */}
      <div className="flex items-start justify-between gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D2FF00] shrink-0 bg-zinc-800 flex items-center justify-center">
          {user.photo_url
            ? <img src={user.photo_url} alt={user.username} className="w-full h-full object-cover" />
            : <span className="text-2xl font-black text-[#D2FF00]">{user.username?.[0]?.toUpperCase()}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-2 px-4 h-10 border border-zinc-700 hover:border-[#D2FF00] text-xs font-bold uppercase tracking-widest">
            <Pencil size={14} /> {editing ? "Close" : "Edit"}
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 h-10 border border-zinc-700 hover:border-[#D2FF00] text-xs font-bold uppercase tracking-widest">
            <Camera size={14} /> Upload photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
        </div>
      </div>

      {/* name */}
      <div>
        <h1 className="text-2xl font-black uppercase tracking-widest">{user.username}</h1>
        {user.full_name && <p className="text-zinc-400 text-sm">{user.full_name}</p>}
      </div>

      {/* view mode */}
      {!editing && (
        <div className="space-y-2">
          {info.length === 0 && <p className="text-zinc-600 text-sm">No info yet — tap Edit to add your details.</p>}
          {info.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 text-sm shrink-0">{label}</span>
              <span className="font-mono text-[#D2FF00] text-sm text-right min-w-0 break-words">{value}</span>
            </div>
          ))}
          {user.self_comment && (
            <div className="pt-3">
              <span className="text-zinc-500 text-xs uppercase tracking-widest block mb-1">About</span>
              <p className="text-sm text-white/80">"{user.self_comment}"</p>
            </div>
          )}
        </div>
      )}

      {/* edit mode */}
      {editing && (
        <div className="space-y-4">
          <Field label="Full name" value={form.full_name} onChange={set("full_name")} />
          <Field label="Birth date" type="date" value={form.birth_date} onChange={set("birth_date")} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Deck size" value={form.deck_size} onChange={set("deck_size")} placeholder="8.25" />
            <div className="space-y-2">
              <label className="text-xs uppercase text-zinc-500">Deck company</label>
              <input list="deck-brands" value={form.deck_company} onChange={set("deck_company")}
                className="w-full px-3 py-2 bg-black border border-zinc-800 text-white text-sm" placeholder="Baker" />
              <datalist id="deck-brands">{DECK_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
          </div>
          <Field label="Fav trick" value={form.fav_trick} onChange={set("fav_trick")} placeholder="Kickflip" />
          <Field label="Fav spot" value={form.fav_spot} onChange={set("fav_spot")} placeholder="Venice" />
          <div className="space-y-2">
            <label className="text-xs uppercase text-zinc-500">About ({form.self_comment.length}/130)</label>
            <textarea value={form.self_comment}
              onChange={(e) => e.target.value.length <= 130 && setForm({ ...form, self_comment: e.target.value })}
              maxLength={130}
              className="w-full h-24 bg-black border border-zinc-800 p-3 text-sm text-white resize-none" />
          </div>
          <button onClick={save} disabled={saving}
            className="w-full h-12 bg-[#D2FF00] text-black font-black uppercase tracking-widest disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {/* direct messages */}
      <Link to="/messages"
        className="flex items-center justify-between px-4 py-4 bg-[#D2FF00]/10 border border-[#D2FF00]/40 hover:bg-[#D2FF00]/20">
        <span className="font-black uppercase tracking-widest text-sm text-[#D2FF00]">✉ Direct Messages</span>
        <span className="text-[#D2FF00] font-black text-lg">→</span>
      </Link>

      {/* feedback + logout */}
      <div className="pt-4 border-t border-zinc-900 space-y-3">
        <FeedbackButton />
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 h-11 border border-[#FF3366] text-[#FF3366] text-xs font-bold uppercase tracking-widest">
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, ...props }) {
  return (
    <div className="space-y-2">
      <label className="text-xs uppercase text-zinc-500">{label}</label>
      <input {...props} value={value || ""} onChange={onChange}
        className="w-full px-3 py-2 bg-black border border-zinc-800 text-white text-sm" />
    </div>
  );
}

function FeedbackButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-4 py-4 bg-zinc-950 border border-zinc-900 hover:border-zinc-700 text-left">
        <div>
          <div className="text-sm font-black uppercase tracking-wider text-white">Send feedback</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mt-0.5">Bug · Lag · Idea · Anything</div>
        </div>
        <span className="text-[#D2FF00] font-black text-lg">→</span>
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}