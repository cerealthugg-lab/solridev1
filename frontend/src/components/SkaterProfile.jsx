import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    axios.get(`${BACKEND_URL}/api/users/${username}/public`, authHdr())
      .then(r => setProfile(r.data))
      .catch(() => setError("Skater not found"))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/tricks/user/${username}`, authHdr())
      .then(r => setTricks(r.data || [])).catch(() => {});
  }, [username]);

  const startDM = () =>
    axios.post(`${BACKEND_URL}/api/conversations`, { username }, authHdr())
      .then(r => navigate(`/messages/${r.data.id}`, { state: { other: username } }))
      .catch(() => toast.error("Couldn't open chat"));
  const blockUser = () =>
    axios.post(`${BACKEND_URL}/api/blocks`, { username }, authHdr()).then(() => toast("User blocked")).catch(() => {});
  const reportUser = () =>
    axios.post(`${BACKEND_URL}/api/dm/report`, { reported_user: username }, authHdr()).then(() => toast("Reported — thanks")).catch(() => {});

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-[#D2FF00] rounded-full animate-spin" />
    </div>
  );
  if (error || !profile) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-sm uppercase tracking-widest">
      {error || "Skater not found"}
    </div>
  );

  const a = calcAge(profile.birth_date);
  const info = [
    ["Deck size", profile.deck_size], ["Deck company", profile.deck_company],
    ["Fav trick", profile.fav_trick], ["Fav spot", profile.fav_spot],
    ["Birth date", profile.birth_date ? `${profile.birth_date}${a != null ? ` · ${a} y.o.` : ""}` : null],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <button onClick={() => navigate(-1)} className="text-zinc-400"><ArrowLeft size={20} /></button>
        <span className="font-black uppercase tracking-widest text-sm">Skater Profile</span>
      </header>

      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#D2FF00] shrink-0 bg-zinc-800 flex items-center justify-center">
            {profile.photo_url
              ? <img src={profile.photo_url} alt={profile.username} className="w-full h-full object-cover" />
              : <span className="text-2xl font-black text-[#D2FF00]">{profile.username?.[0]?.toUpperCase()}</span>}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black uppercase tracking-widest truncate">{profile.username}</h1>
            {profile.deck_company && <p className="text-xs text-zinc-500 uppercase tracking-widest">Deck · {profile.deck_company}</p>}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={startDM} className="flex-1 h-10 bg-[#D2FF00] text-black font-bold uppercase tracking-widest text-xs">Message</button>
          <button onClick={blockUser} className="h-10 px-3 border border-zinc-700 text-zinc-400 text-xs uppercase">Block</button>
          <button onClick={reportUser} className="h-10 px-3 border border-[#FF3366] text-[#FF3366] text-xs uppercase">Report</button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6">
          <Stat n={profile.spot_count ?? 0} label="Spots" />
          <Stat n={profile.ride_count ?? 0} label="Rides" />
          <Stat n={tricks.length} label="Tricks" />
        </div>
      </div>

      {info.length > 0 && (
        <div className="p-6 border-b border-zinc-800 space-y-2">
          {info.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400 text-sm shrink-0">{label}</span>
              <span className="font-mono text-[#D2FF00] text-sm text-right min-w-0 break-words">{value}</span>
            </div>
          ))}
          {profile.self_comment && <p className="text-sm text-white/80 pt-2">"{profile.self_comment}"</p>}
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Play size={16} className="text-[#D2FF00]" />
          <h2 className="text-sm font-black uppercase tracking-widest">Tricks</h2>
        </div>
        {tricks.length === 0 ? (
          <p className="text-xs text-zinc-600 uppercase tracking-widest text-center py-6">No tricks uploaded yet</p>
        ) : (
              
          <div className="space-y-3">
  {tricks.map((t) => (
    <div key={t.id} className="border border-zinc-800 bg-[#0a0a0d] overflow-hidden">
      <video src={t.video_url} muted playsInline controls
        className="w-full aspect-square object-cover bg-black" />
      <div className="p-3 flex items-center justify-between text-xs">
        <span className="text-zinc-400 truncate">
          📍 {t.spot_id ? (t.spot_name || 'Spot') : (t.spot_name ? `${t.spot_name} (removed)` : 'Spot removed')}
        </span>
        <span className="text-[#D2FF00] font-bold shrink-0">⚡ {t.tips_received ?? 0} DFQ</span>
      </div>
      {t.caption && <p className="px-3 pb-3 text-xs text-white/70">{t.caption}</p>}
    </div>
  ))}
</div>
              
        )}
      </div>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
      <div className="text-2xl font-black text-[#D2FF00]">{n}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{label}</div>
    </div>
  );
}