import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Flame, HelpCircle, Send, Radio, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function GlobalWire({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const me = (currentUser?.username || "").toLowerCase();
  const navigate = useNavigate();

  // Load the shared public message board logs
  const loadWire = useCallback(() => {
    axios.get(`${BACKEND_URL}/api/global-wire`, auth())
      .then(r => {
        setMessages(r.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadWire();
    const interval = setInterval(loadWire, 4000); // Polls fast for real-time cop/session alerts
    return () => clearInterval(interval);
  }, [loadWire]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const broadcastMessage = (tagType = "general") => {
    const body = text.trim();
    if (!body) return;
    setText("");
    
    // Sends the message along with a contextual metadata tag string
    axios.post(`${BACKEND_URL}/api/global-wire`, { body, tag: tagType }, auth())
      .then(loadWire)
      .catch(() => {});
  };

  // Quick helper to detect skate tags in text or data strings
  const getAlertStyle = (body = "") => {
    const txt = body.toLowerCase();
    if (txt.includes("cop") || txt.includes("police") || txt.includes("cops") || txt.includes("🚨")) {
      return { border: "border-red-900/60 bg-red-950/20 text-red-400", badge: "🚨 COPS" };
    }
    if (txt.includes("ride") || txt.includes("skate") || txt.includes("session") || txt.includes("🛹")) {
      return { border: "border-[#D2FF00]/20 bg-[#D2FF00]/5 text-[#D2FF00]", badge: "🛹 RIDE" };
    }
    return { border: "border-neutral-900 bg-neutral-950/40 text-neutral-300", badge: "📣 WIRE" };
  };

  const filteredMessages = messages.filter(m => {
    if (activeFilter === "all") return true;
    const txt = m.body.toLowerCase();
    if (activeFilter === "cops") return txt.includes("cop") || txt.includes("police") || txt.includes("🚨");
    if (activeFilter === "sessions") return txt.includes("ride") || txt.includes("skate") || txt.includes("🛹");
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-24 flex flex-col selection:bg-[#D2FF00] selection:text-black">
      {/* Sticky High-Contrast Live Activity Broadcast Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-neutral-900 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-[#FF3366] animate-pulse" />
            <h1 className="text-lg font-black uppercase tracking-tighter italic">Street Wire</h1>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-md animate-pulse">
            Live Feed
          </span>
        </div>

        {/* Quick-Tap Quick Scan Filter Navigation Pills */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 bg-neutral-950 p-1 rounded-xl border border-neutral-900">
          <button onClick={() => setActiveFilter("all")} className={`py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeFilter === "all" ? "bg-neutral-800 text-white" : "text-neutral-500"}`}>All Logs</button>
          <button onClick={() => setActiveFilter("cops")} className={`py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${activeFilter === "cops" ? "bg-red-950 text-red-400 border border-red-900/60" : "text-neutral-500"}`}>🚨 Alert</button>
          <button onClick={() => setActiveFilter("sessions")} className={`py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${activeFilter === "sessions" ? "bg-[#D2FF00]/10 text-[#D2FF00] border border-[#D2FF00]/20" : "text-neutral-500"}`}>🛹 Rides</button>
        </div>
      </header>

      {/* Main Streaming Activity Feed Feed List Box Layout */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-neutral-500 text-xs font-bold uppercase tracking-widest gap-2">
            <Loader2 size={18} className="animate-spin text-[#D2FF00]" />
            <span>Connecting To Frequency...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-20 text-neutral-600 text-xs font-bold uppercase tracking-widest">
            Wire frequencies clear for now...
          </div>
        ) : (
          filteredMessages.map((m) => {
            const style = getAlertStyle(m.body);
            const isMe = (m.username || "").toLowerCase() === me;
            
            return (
              <div key={m.id} className="w-full animate-fadeIn">
                <div className={`border rounded-2xl p-3 space-y-2 transition-all ${style.border}`}>
                  <div className="flex items-center justify-between">
                    {/* Click username to jump straight to their newly stylized profile */}
                    <button 
                      onClick={() => navigate(`/skater/${m.username}`)}
                      className={`text-xs font-black lowercase tracking-tight ${isMe ? "text-[#D2FF00]" : "text-neutral-400 hover:text-white"}`}
                    >
                      @{m.username || "skater"} {isMe && "(you)"}
                    </button>
                    <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded bg-black/40 border border-neutral-900/60 text-neutral-500 uppercase">
                      {style.badge}
                    </span>
                  </div>
                  <p className="text-sm font-medium tracking-tight leading-relaxed break-words text-neutral-100">
                    {m.body}
                  </p>
                  <div className="text-[8px] font-mono text-neutral-600 text-right uppercase">
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "just now"}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action Broadcast Input Deck Terminal Dock */}
      <div className="p-3 bg-black border-t border-neutral-900 shrink-0 pb-safe sticky bottom-0">
        <div className="max-w-md mx-auto relative flex items-center">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && broadcastMessage()}
            placeholder="Alert crew! 'Cops at Venice' or 'Session at 4PM'..."
            className="w-full h-10 pl-4 pr-24 bg-neutral-950 border border-neutral-900 rounded-xl text-sm text-white placeholder-neutral-600 focus:border-[#D2FF00]/30 focus:outline-none transition-colors" 
          />
          
          {/* Quick Context Quick Broadcast Buttons Right Inside input bar */}
          <div className="absolute right-1.5 flex gap-1">
            <button 
              onClick={() => broadcastMessage("alert")} 
              disabled={!text.trim()}
              className="w-7 h-7 bg-red-950 border border-red-900/40 text-red-400 disabled:opacity-20 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
              title="Broadcast Cop Warning"
            >
              <ShieldAlert size={12} />
            </button>
            <button 
              onClick={() => broadcastMessage("general")} 
              disabled={!text.trim()}
              className="w-7 h-7 bg-[#D2FF00] text-black disabled:bg-neutral-900 disabled:text-neutral-600 disabled:opacity-100 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
            >
              <Send size={11} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
