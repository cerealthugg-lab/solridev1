import React, { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

  // track the VISIBLE viewport (height + top offset) — handles the mobile keyboard
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
    <div className="fixed left-0 right-0 z-[9999] bg-black flex flex-col"
      style={{ top: vp.top, height: vp.height }}>
      
      {/* Immersive Snapchat Style Header */}
      <header className="flex items-center gap-3 p-3 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-900 shrink-0">
        <button onClick={() => navigate("/messages")} className="text-neutral-400 text-xl font-bold active:scale-90 transition-transform">←</button>
          
        {other ? (
          <button onClick={() => navigate(`/skater/${other}`)}
            className="font-black tracking-tight text-sm text-white hover:text-[#D2FF00] transition-colors lowercase">
            @{other}
          </button>
        ) : (
          <span className="font-black uppercase tracking-widest text-sm text-white">Chat</span>
        )}
      </header>

      {/* Clean Instagram Style Chat Stream Bubble Layout */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
        {messages.length === 0 && <p className="text-center text-neutral-600 text-xs font-bold uppercase tracking-widest mt-8">Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id}
            className={`max-w-[75%] px-4 py-2 text-sm tracking-tight rounded-2xl break-words leading-relaxed font-medium ${
              m.sender_id === me 
                ? "ml-auto bg-[#D2FF00] text-black font-semibold rounded-tr-sm shadow-md" 
                : "bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-tl-sm"
            }`}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Premium Docked Mobile Message Area Input Container */}
      <div className="flex gap-2 p-3 bg-black border-t border-neutral-900 shrink-0 pb-safe">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView(), 300)}
          placeholder="Drop a note..."
          className="flex-1 px-4 py-2 bg-neutral-950 border border-neutral-900 rounded-xl text-sm text-white placeholder-neutral-600 focus:border-[#D2FF00]/40 focus:outline-none transition-colors" />
        <button onClick={send} className="px-5 h-9 bg-[#D2FF00] text-black font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-transform flex items-center justify-center">Send</button>
      </div>

    </div>
  );
}
