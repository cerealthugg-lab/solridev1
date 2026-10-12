import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function Conversation({ currentUsername }) {
  const { cid } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [vp, setVp] = useState({ top: 0, height: window.innerHeight });
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const me = (currentUsername || "").toLowerCase();
  const location = useLocation();
  const [other, setOther] = useState(location.state?.other || "");
    
  const load = useCallback(() => {
    axios.get(`${BACKEND_URL}/api/conversations/${cid}/messages`, auth())
      .then(r => {
        const data = r.data || [];
        setMessages(data);
        setOther(prev => prev || data.find(m => m.sender_id !== me)?.sender_id || prev);
      }).catch(() => {});
  }, [cid, me]);

  useEffect(() => {
    load();
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setVp({
      top: vv ? vv.offsetTop : 0,
      height: vv ? vv.height : window.innerHeight,
    });
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, vp]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    axios.post(`${BACKEND_URL}/api/conversations/${cid}/messages`, { body }, auth())
      .then(load).catch(() => {});
  };

  return (
    <div className="fixed left-0 right-0 z-[9999] bg-black flex flex-col selection:bg-[#D2FF00] selection:text-black" style={{ top: vp.top, height: vp.height }}>
      {/* Immersive Social Chat Room Titlebar Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 shrink-0">
        <button onClick={() => navigate("/messages")} className="p-1 text-neutral-400 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          {other ? (
            <button onClick={() => navigate(`/skater/${other}`)} className="font-black text-sm tracking-tight text-white hover:text-[#D2FF00] transition-colors lowercase block truncate">
              @{other}
            </button>
          ) : (
            <span className="font-black text-sm text-white tracking-widest uppercase">Chat Terminal</span>
          )}
        </div>
        <span className="w-2 h-2 rounded-full bg-[#D2FF00] animate-pulse shadow-[0_0_8px_#D2FF00]" />
      </header>

      {/* Message History Scroller Feed Layout Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-black via-zinc-950 to-black">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center select-none">
            <span className="text-xl mb-1">🛹</span>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Drop a direct session invite</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = (m.sender_id || "").toLowerCase() === me;
            return (
              <div key={m.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2.5 text-sm font-medium tracking-tight rounded-2xl break-words leading-relaxed ${
                  isMe 
                    ? "bg-[#D2FF00] text-black rounded-tr-sm font-semibold shadow-lg shadow-[#D2FF00]/5" 
                    : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tl-sm"
                }`}>
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Minimalist Message Box Interface Dock */}
      <div className="flex items-center gap-2 p-3 bg-black border-t border-neutral-900 shrink-0 pb-safe">
        <div className="relative flex-1 flex items-center">
          <input 
            value={text} 
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView(), 300)}
            placeholder="Drop a note..."
            className="w-full h-10 pl-4 pr-10 bg-neutral-950 border border-neutral-900 rounded-xl text-sm text-white placeholder-neutral-600 focus:border-[#D2FF00]/30 focus:outline-none transition-colors" 
          />
          <button 
            onClick={send} 
            disabled={!text.trim()}
            className="absolute right-2 w-7 h-7 bg-[#D2FF00] disabled:bg-neutral-900 text-black disabled:text-neutral-600 rounded-lg flex items-center justify-center transition-all active:scale-90"
          >
            <Send size={12} className="stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
