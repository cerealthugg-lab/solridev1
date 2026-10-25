import React, { useState } from 'react';
import axios from 'axios';
import { Flag, Ban, X } from 'lucide-react';
import { toast } from './ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((c) => { const t = localStorage.getItem('token'); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
const REASONS = ['Harassment or hate', 'Nudity or sexual', 'Violence or dangerous', 'Spam or scam', 'Other'];

export default function ReportBlockSheet({ open, onClose, contentType, contentId, ownerUsername, onHidden }) {
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const run = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast.success(okMsg); onHidden?.(); onClose(); }
    catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[10000] flex items-end lg:items-center justify-center">
      <button aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-neutral-950 border-t lg:border border-neutral-800 rounded-t-3xl lg:rounded-3xl p-5 space-y-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2"><Flag size={14} className="text-[#FF3366]" /> Report {contentType}</span>
          <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-neutral-400"><X size={18} /></button>
        </div>
        {REASONS.map((r) => (
          <button key={r} disabled={busy}
            onClick={() => run(() => api.post('/reports', { content_type: contentType, content_id: contentId, reason: r }), 'Reported. We review reports within 24h.')}
            className="w-full h-12 px-4 text-left rounded-xl bg-neutral-900 border border-neutral-800 text-sm text-white disabled:opacity-50">{r}</button>
        ))}
        {ownerUsername && (
          <button disabled={busy} onClick={() => run(() => api.post('/blocks', { username: ownerUsername }), `@${ownerUsername} blocked`)}
            className="w-full h-12 mt-2 rounded-xl border border-[#FF3366]/40 text-[#FF3366] text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
            <Ban size={14} /> Block @{ownerUsername}
          </button>
        )}
      </div>
    </div>
  );
}