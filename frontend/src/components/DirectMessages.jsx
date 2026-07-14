import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

function Avatar({ url, name }) {
  if (url) return <img src={url} alt={name} className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0" />;
  return <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-[#D2FF00] shrink-0">{name?.[0]?.toUpperCase()}</div>;
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
      .then(r => navigate(`/messages/${r.data.id}`)).catch(() => {});

  return (
    <div className="max-w-md mx-auto p-4 text-white">
      <h1 className="text-2xl font-black uppercase tracking-widest mb-4">Direct Messages</h1>
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search skaters by nickname…"
        className="w-full mb-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-sm" />
      {results.length > 0 && (
        <div className="mb-4 border border-zinc-800 rounded divide-y divide-zinc-800">
          {results.map((u) => (
            <button key={u.username} onClick={() => open(u.username)}
              className="flex items-center gap-3 w-full p-3 hover:bg-zinc-900 text-left">
              <Avatar url={u.photo_url} name={u.username} />
              <span className="font-bold">@{u.username}</span>
            </button>
          ))}
        </div>
      )}
      <div className="border border-zinc-800 rounded divide-y divide-zinc-800">
        {convos.length === 0 && <p className="p-4 text-zinc-500 text-sm">No conversations yet.</p>}
        {convos.map((c) => (
          <button key={c.id} onClick={() => navigate(`/messages/${c.id}`)}
            className="flex items-center gap-3 w-full p-3 hover:bg-zinc-900 text-left">
            <Avatar url={c.other_photo} name={c.other_user} />
            <div className="min-w-0 flex-1">
              <div className="font-bold truncate">@{c.other_user}</div>
              <div className="text-xs text-zinc-500 truncate">{c.last_message || "…"}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}