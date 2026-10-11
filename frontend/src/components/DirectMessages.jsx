import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, ChevronRight, MessageSquare, ArrowLeft } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

function Avatar({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />;
  return <div className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-black text-[#D2FF00] shrink-0 text-sm tracking-tighter">{name?.[0]?.toUpperCase()}</div>;
}

export default function DirectMessages() {
  const [convos, setConvos] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/conversations`, auth()).then(r => setConvos(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      axios.get(`${BACKEND_URL}/api/users/search?q=${encodeURIComponent(q)}`, auth())
        .then(r => setResults(r.data || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const open = (username) =>
    axios.post(`${BACKEND_URL}/api/conversations`, { username }, auth())
      .then(r => navigate(`/messages/${r.data.id}`, { state: { other: username } })).catch(() => {});

  return (
    <div className="min-h-screen bg-black text-white pb-24 selection:bg-[#D2FF00] selection:text-black">
      {/* Premium Social Inbox Titlebar Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-md border-b border-neutral-900/60">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 text-neutral-400 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <span className="font-black tracking-tight text-base uppercase italic">Messages</span>
        </div>
        <span className="text-[10px] font-bold bg-[#D2FF00]/10 border border-[#D2FF00]/20 text-[#D2FF00] px-2 py-0.5 rounded-md tracking-wider">Crew Inbox</span>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* iOS / Instagram Style Modern Floating Input Shutter Search */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-neutral-500 pointer-events-none" />
          <input 
            value={q} 
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search active skaters..."
            className="w-full h-10 pl-9 pr-4 bg-neutral-950 border border-neutral-900 rounded-xl text-sm placeholder-neutral-600 focus:border-[#D2FF00]/40 focus:outline-none transition-colors" 
          />
        </div>

        {/* Dynamic Global User Search Query Results Dropdown Overlay */}
        {results.length > 0 && (
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden divide-y divide-neutral-900 animate-fadeIn shadow-2xl">
            <div className="px-4 py-2 bg-neutral-900/20 text-[9px] font-black tracking-widest text-neutral-500 uppercase">Skaters Found</div>
            {results.map((u) => (
              <button key={u.username} onClick={() => open(u.username)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-neutral-900/30 active:bg-neutral-900/50 text-left transition-all group">
                <Avatar url={u.photo_url} name={u.username} />
                <span className="font-bold text-sm flex-1">@{u.username}</span>
                <ChevronRight size={14} className="text-neutral-600 group-hover:text-[#D2FF00] transition-colors" />
              </button>
            ))}
          </div>
        )}

        {/* Core Conversations Chat Feed Thread Area */}
        <div className="space-y-1">
          {convos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-900 flex items-center justify-center mb-3">
                <MessageSquare size={18} className="text-neutral-600" />
              </div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">No active threads yet</p>
              <p className="text-[10px] text-neutral-600 max-w-[180px] mt-1 leading-relaxed">Search a user above to drop a direct note or sync up</p>
            </div>
          ) : (
            convos.map((c) => (
              <button 
                key={c.id} 
                onClick={() => navigate(`/messages/${c.id}`, { state: { other: c.other_user } })}
                className="flex items-center gap-3.5 w-full px-4 h-18 bg-neutral-950/20 border border-neutral-950 hover:bg-neutral-950/60 rounded-2xl text-left transition-all duration-200"
              >
                <div className="relative">
                  <Avatar url={c.other_photo} name={c.other_user} />
                  {/* Subtle online brand indicator dot node */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#D2FF00] border-2 border-black rounded-full shadow-[0_0_8px_#D2FF00]" />
                </div>
                
                <div className="min-w-0 flex-1 py-3">
                  <div className="font-black text-sm text-neutral-100 tracking-tight lowercase">@{c.other_user}</div>
                  <div className="text-xs font-medium text-neutral-500 truncate mt-0.5">{c.last_message || "No messages shared yet..."}</div>
                </div>
                
                <ChevronRight size={14} className="text-neutral-700 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
