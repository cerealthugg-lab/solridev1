import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { X, Loader2, Trash2, Send } from 'lucide-react';
import { toast } from './ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TrickComments({ open, onClose, trick, currentUsername, onCountChange }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const listRef = useRef(null);
  const countRef = useRef(onCountChange);
  countRef.current = onCountChange;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/tricks/${trick.id}/comments`)
      .then((r) => {
        if (cancelled) return;
        setComments(r.data || []);
        countRef.current?.((r.data || []).length);
      })
      .catch(() => { if (!cancelled) toast.error("Couldn't load comments"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, trick.id]);

  if (!open) return null;

  const post = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (posting || !content) return;
    setPosting(true);
    try {
      const r = await api.post(`/tricks/${trick.id}/comments`, { content });
      const next = [...comments, r.data];
      setComments(next);
      countRef.current?.(next.length);
      setText('');
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Couldn't post comment");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (c) => {
    try {
      await api.delete(`/tricks/comments/${c.id}`);
      const next = comments.filter((x) => x.id !== c.id);
      setComments(next);
      countRef.current?.(next.length);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const canDelete = (c) => currentUsername && (c.username === currentUsername || trick.user_id === currentUsername);

  return createPortal(
    <div data-testid="trick-comments-sheet" className="fixed inset-0 z-[10000] flex items-end lg:items-center justify-center">
      <button aria-label="Close comments" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full max-w-md h-[70vh] flex flex-col bg-neutral-950 border-t lg:border border-neutral-800 rounded-t-3xl lg:rounded-3xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-neutral-800 lg:hidden" />
        <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-900">
          <span className="w-11" />
          <span className="text-sm font-black uppercase tracking-widest text-white">Comments</span>
          <button onClick={onClose} data-testid="trick-comments-close" className="w-11 h-11 flex items-center justify-center text-neutral-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-neutral-500 text-xs font-bold uppercase tracking-widest">
              <Loader2 size={16} className="animate-spin text-[#D2FF00]" /> Loading...
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold text-white">No comments yet</p>
              <p className="text-xs text-neutral-500 mt-1">Be the first to hype this clip.</p>
            </div>
          ) : comments.map((c) => (
            <div key={c.id} data-testid={`trick-comment-${c.id}`} className="flex gap-3 group">
              <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black uppercase text-[#D2FF00]">
                {c.username?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-200 break-words">
                  <Link to={`/skater/${c.username}`} onClick={onClose} className="font-bold text-white mr-1.5">{c.username}</Link>
                  {c.content}
                </p>
                <span className="text-[11px] text-neutral-500">{timeAgo(c.created_at)}</span>
              </div>
              {canDelete(c) && (
                <button onClick={() => remove(c)} aria-label="Delete comment" data-testid={`trick-comment-delete-${c.id}`}
                  className="w-8 h-8 shrink-0 flex items-center justify-center text-neutral-600 hover:text-[#FF3366]">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={post} className="flex items-center gap-2 px-3 py-3 border-t border-neutral-900">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            placeholder={`Comment as @${currentUsername || ''}...`}
            data-testid="trick-comment-input"
            className="flex-1 h-11 bg-neutral-900 border border-neutral-800 focus:border-[#D2FF00]/50 outline-none rounded-full px-4 text-base text-white placeholder:text-neutral-600"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            data-testid="trick-comment-post"
            className="h-11 px-4 rounded-full bg-[#D2FF00] text-black text-sm font-bold disabled:opacity-40 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            {posting ? <><Loader2 size={14} className="animate-spin" /> Posting...</> : <><Send size={14} /> Post</>}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}