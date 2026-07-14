import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Play } from 'lucide-react';
import TrickCard from './TrickCard';
import {toast} from 'sonner';



const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const _auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

  const startDM = () =>
    axios.post(`${BACKEND_URL}/api/conversations`, { username: profile.username }, _auth())
      .then(r => navigate(`/messages/${r.data.id}`))
      .catch(() => toast.error("Couldn't open chat"));

  const blockUser = () =>
    axios.post(`${BACKEND_URL}/api/blocks`, { username: profile.username }, _auth())
      .then(() => toast("User blocked")).catch(() => {});

  const reportUser = () =>
    axios.post(`${BACKEND_URL}/api/dm/report`, { reported_user: profile.username }, _auth())
      .then(() => toast("Reported — thanks")).catch(() => {});

const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use(function (config) {
  var token = localStorage.getItem('token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

function SkaterProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/users/' + username + '/public')
      .then(res => setProfile(res.data))
      .catch(() => setError("Skater not found"))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-500 uppercase tracking-widest text-xs">Loading skater...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <p className="text-[#FF3366] font-bold uppercase tracking-widest text-sm mb-4">Skater not found</p>
        <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest">
          ← Go back
        </button>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="text-zinc-500 hover:text-white" size={22} />
        </button>
        <p className="font-black uppercase tracking-widest text-sm">Skater Profile</p>
      </div>

      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1">
          {profile.username}
        </h1>
          
          
          <div className="flex gap-2 mt-3 mb-4">
  <button onClick={startDM}
    className="flex-1 h-10 bg-[#D2FF00] text-black font-bold uppercase tracking-widest text-xs rounded">
    Message
  </button>
  <button onClick={blockUser}
    className="h-10 px-3 border border-zinc-700 text-zinc-400 text-xs uppercase rounded">Block</button>
  <button onClick={reportUser}
    className="h-10 px-3 border border-[#FF3366] text-[#FF3366] text-xs uppercase rounded">Report</button>
</div>
{profile.deck_company && (
  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Deck · {profile.deck_company}</p>
)}
          
        <p className="text-xs text-zinc-500 uppercase tracking-widest">
          Member since {memberSince}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-6">
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-2xl font-black text-[#D2FF00]">{profile.spot_count}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Spots</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-2xl font-black text-[#D2FF00]">{profile.ride_count}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Rides</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-2xl font-black text-[#D2FF00]">0</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Tricks</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {profile.deck_size && (
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400 text-sm">Deck Size</span>
            <span className="font-mono text-[#D2FF00] text-sm">{profile.deck_size}</span>
          </div>
        )}
        {profile.deck_company && (
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400 text-sm">Deck Company</span>
            <span className="font-mono text-[#D2FF00] text-sm">{profile.deck_company}</span>
          </div>
        )}
        {profile.fav_trick && (
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400 text-sm">Fav Trick</span>
            <span className="font-mono text-[#D2FF00] text-sm">{profile.fav_trick}</span>
          </div>
        )}
        {profile.fav_spot && (
          <div className="flex justify-between border-b border-zinc-800 pb-2">
            <span className="text-zinc-400 text-sm">Fav Spot</span>
            <span className="font-mono text-[#D2FF00] text-sm">{profile.fav_spot}</span>
          </div>
        )}
        {profile.self_comment && (
          <div className="pt-3">
            <span className="text-zinc-500 text-xs uppercase tracking-widest block mb-2">About</span>
            <p className="text-sm text-white/80 leading-relaxed italic">"{profile.self_comment}"</p>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Play size={16} className="text-[#D2FF00]" />
          <h2 className="text-sm font-black uppercase tracking-widest">Tricks</h2>
        </div>
        <p className="text-xs text-zinc-600 uppercase tracking-widest text-center py-6">
          No tricks uploaded yet
        </p>
      </div>
    </div>
  );
}

export default SkaterProfile;