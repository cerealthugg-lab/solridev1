Privacy policy URL — mandatory in App Store Connect
Terms of Service URL — mandatory
Delete account button — MANDATORY since iOS 14 (Apple rejects without it)
Age gate on registration — 13+ minimum (COPPA)
In-app purchase disclaimer if any DFQ→USD conversion mentioned
Support/contact email — required in metadata
App icon in all sizes (1024x1024 master + auto-generated)
Screenshots (6.7", 6.5", 5.5" iPhone)
App description + keywords + category
📋 Realistic App Store Timeline
If you keep current pace of ~1-2 features per week:
6-8 weeks to reach submission-ready state
1-2 weeks Apple review (first submission usually rejected — plan 2 rounds)
Total: ~2 months from today
Not bad! Very doable if you don't add new massive features (like video) before submission. Ship video as v1.1 update post-launch — Apple loves regular updates.
Videos can wait. Focus on: chat + public profiles + polish + legal pages → submit.
🚮 STEP 1 — Remove Find My Tool (Copy-Paste Ready)
In frontend/src/App.js, find and delete this entire block:
<Link to="/find-tool" className="block mt-4">
  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#D2FF00] transition-colors cursor-pointer group">
    <CardContent className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-zinc-950 rounded-full group-hover:bg-[#D2FF00] group-hover:text-black transition-colors text-white">
          <Wrench size={20} />
        </div>
        <div>
          <span className="font-bold uppercase tracking-wider text-sm text-white block">Find My Tool</span>
          <span className="text-xs text-zinc-500">GPS Tracker • Beep</span>
        </div>
      </div>
      <div className="text-xs text-[#D2FF00] font-mono uppercase">V2</div>
    </CardContent>
  </Card>
</Link>
Also check if there's a /find-tool route — if yes, delete that too:
grep -n "find-tool" frontend/src/App.js
If it's there, delete the entire <Route path="/find-tool" ... /> line.
👤 STEP 2 — Public Skater Profile Page (Option B, Full Route)
2A. Backend — Add new endpoint (in server.py)
Add anywhere in /users section:
@api.get("/users/{username}/public")
async def get_public_profile(username: str):
    username = username.lower().strip()
    res = supabase.table('users').select(
        'username, deck_size, deck_company, fav_trick, fav_spot, self_comment, birth_date, has_first_ride, created_at'
    ).eq('username', username).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Skater not found")
    
    user = res.data[0]
    
    # Add stats
    spots = supabase.table('spots').select('id', count='exact').eq('user_id', username).execute()
    rides = supabase.table('rides').select('id', count='exact').eq('user_id', username).eq('status', 'completed').execute()
    
    return {
        **user,
        "spot_count": spots.count or 0,
        "ride_count": rides.count or 0
    }
2B. Frontend — Create new file frontend/src/components/SkaterProfile.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MapPin, Play, Award } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
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
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="text-zinc-500 hover:text-white" size={22} />
        </button>
        <p className="font-black uppercase tracking-widest text-sm">Skater Profile</p>
      </div>

      {/* Hero */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-1">
          {profile.username}
        </h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest">
          Member since {memberSince}
        </p>

        {/* Stats row */}
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

      {/* Info card */}
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

      {/* Tricks section (placeholder for now) */}
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