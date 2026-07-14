import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function Conversation({ currentUsername }) {
  const { cid } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [vh, setVh] = useState(window.innerHeight);
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const me = (currentUsername || "").toLowerCase();

  const load = useCallback(() => {
    axios.get(`${BACKEND_URL}/api/conversations/${cid}/messages`, auth())
      .then(r => setMessages(r.data || [])).catch(() => {});
  }, [cid]);

  useEffect(() => {
    load();
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
  }, [load]);

  // track the VISIBLE viewport so the input stays above the mobile keyboard
  useEffect(() => {
    const vv = window.visualViewport;
    const onResize = () => setVh(vv ? vv.height : window.innerHeight);
    onResize();
    vv?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => { vv?.removeEventListener("resize", onResize); window.removeEventListener("resize", onResize); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, vh]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    axios.post(`${BACKEND_URL}/api/conversations/${cid}/messages`, { body }, auth())
      .then(load).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" style={{ height: vh }}>
      <header className="flex items-center gap-3 p-3 border-b border-zinc-800 shrink-0">
        <button onClick={() => navigate("/messages")} className="text-zinc-400 text-2xl leading-none">←</button>
        <span className="font-black uppercase tracking-widest text-sm text-white">Chat</span>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && <p className="text-center text-zinc-600 text-sm mt-8">Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${m.sender_id === me ? "ml-auto bg-[#D2FF00] text-black" : "bg-zinc-800 text-white"}`}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 p-3 border-t border-zinc-800 shrink-0"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}>
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          onFocus={() => setTimeout(() => bottomRef.current?.scrollIntoView(), 300)}
          placeholder="Message…"
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-white" />
        <button onClick={send} className="px-5 bg-[#D2FF00] text-black font-bold rounded-full">Send</button>
      </div>
    </div>
  );
}