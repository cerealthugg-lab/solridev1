import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function Conversation({ currentUsername }) {
  const { cid } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const me = (currentUsername || "").toLowerCase();

  const load = () =>
    axios.get(`${BACKEND_URL}/api/conversations/${cid}/messages`, auth())
      .then(r => setMessages(r.data || [])).catch(() => {});

  useEffect(() => {
    load();
    const i = setInterval(load, 3000); // standard polling
    return () => clearInterval(i);
  }, [cid]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    axios.post(`${BACKEND_URL}/api/conversations/${cid}/messages`, { body }, auth())
      .then(load).catch(() => {});
  };

  return (
    <div className="max-w-md mx-auto flex flex-col h-[100dvh] text-white">
      <header className="flex items-center gap-3 p-3 border-b border-zinc-800">
        <button onClick={() => navigate("/messages")} className="text-zinc-400 text-xl">←</button>
        <span className="font-black uppercase tracking-widest text-sm">Chat</span>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id}
            className={`max-w-[75%] px-3 py-2 rounded-lg text-sm break-words ${m.sender_id === me ? "ml-auto bg-[#D2FF00] text-black" : "bg-zinc-800"}`}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-zinc-800">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm" />
        <button onClick={send} className="px-4 bg-[#D2FF00] text-black font-bold rounded">Send</button>
      </div>
    </div>
  );
}
