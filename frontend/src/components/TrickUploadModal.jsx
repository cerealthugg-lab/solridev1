import React, { useState, useEffect, useRef } from 'react';
import { X, Video, Loader2, AtSign, Trash2 } from 'lucide-react';
import axios from 'axios';
import { toast } from './ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const api = axios.create({ baseURL: `${BACKEND_URL}/api` });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const TRICK_PRESETS = [
  'Ollie', 'Kickflip', 'Heelflip', 'Pop shove-it', 'Varial flip',
  '360 flip', 'Hardflip', 'Nollie', 'Fakie flip', 'Manual',
  'Nose manual', '50-50', 'Boardslide', 'Nosegrind', '5-0',
  'Crooked grind', 'Feeble', 'Smith', 'Bluntslide', 'Impossible',
];

const MAX_SECONDS = 15;

function TrickUploadModal({ open, onClose, spot, onUploaded }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [trickName, setTrickName] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setVideoFile(null); setVideoUrl(null); setDuration(0);
      setTrickName(''); setCaption(''); setTags('');
      setError(''); setProgress(0); setSubmitting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  if (!open) return null;

  const pickVideo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setError('Video too big (max 50MB)'); return; }
    setError('');
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(f);
    setVideoFile(f);
    setVideoUrl(url);

    // Read duration
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const d = v.duration || 0;
      setDuration(d);
      if (d > MAX_SECONDS + 0.5) {
        setError(`Clip is ${d.toFixed(1)}s — max ${MAX_SECONDS}s. Trim it first.`);
      }
      URL.revokeObjectURL(v.src);
    };
    v.src = url;
  };

  const submit = async () => {
    if (submitting) return;
    if (!videoFile) { setError('Pick a video first'); return; }
    if (!trickName.trim()) { setError('Pick a trick name'); return; }
    if (duration < 1 || duration > MAX_SECONDS) {
      setError(`Video must be 1–${MAX_SECONDS} seconds`); return;
    }
    setSubmitting(true); setError(''); setProgress(0);

    const fd = new FormData();
    fd.append('video', videoFile);
    fd.append('trick_name', trickName.trim());
    fd.append('caption', caption.trim());
    fd.append('spot_id', spot.id);
    fd.append('tagged_users', tags);
    fd.append('duration_seconds', duration.toFixed(2));

    try {
      const res = await api.post('/tricks', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success(`Trick landed! +${res.data.earned} DFQ 🛹`);
      onUploaded?.(res.data.trick);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="trick-upload-modal"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm px-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 relative max-h-[94vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] via-[#00D2FF] to-[#FF3366]" />

        <button
          onClick={onClose}
          data-testid="trick-upload-close"
          className="absolute top-3 right-3 text-zinc-500 hover:text-white p-2"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-6 pt-8">
          <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-zinc-500">
            @ {spot?.name || 'this spot'}
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
            Land a trick
          </h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-[0.15em] font-bold">
            5 DFQ per clip · 5-a-day max
          </p>

          {/* VIDEO PICKER */}
          <div className="mt-6">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">
              Clip <span className="text-zinc-700 normal-case tracking-normal">(max {MAX_SECONDS}s)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              capture="environment"
              onChange={pickVideo}
              data-testid="trick-video-input"
              className="hidden"
            />
            {videoUrl ? (
              <div className="relative border border-zinc-800">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  muted
                  className="w-full max-h-64 bg-black"
                />
                <button
                  onClick={() => { setVideoFile(null); setVideoUrl(null); setDuration(0); if (fileRef.current) fileRef.current.value=''; }}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-black text-white p-1.5"
                  data-testid="trick-video-clear"
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </button>
                {duration > 0 && (
                  <div className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                    {duration.toFixed(1)}s
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                data-testid="trick-video-pick"
                className="w-full border border-dashed border-zinc-800 hover:border-[#D2FF00] hover:text-[#D2FF00] text-zinc-500 h-28 flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Video size={22} />
                <span className="text-[10px] tracking-[0.25em] uppercase font-bold">Record or upload</span>
              </button>
            )}
<p className="text-[9px] uppercase tracking-[0.2em] text-zinc-700 font-bold mt-2 leading-relaxed">
              iPhone tip: if the clip won't play for others, switch<br />
              <span className="text-zinc-500">Settings → Camera → Formats → Most Compatible</span>
            </p>
          </div>

          {/* TRICK NAME */}
          <div className="mt-5">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">
              Trick name
            </label>
            <input
              value={trickName}
              onChange={(e) => setTrickName(e.target.value)}
              placeholder="Kickflip, 360 flip, Bluntslide..."
              maxLength={60}
              list="trick-presets"
              data-testid="trick-name-input"
              className="w-full bg-black text-white border border-zinc-800 focus:border-[#D2FF00] focus:outline-none rounded-none h-11 px-3 text-base transition-colors"
            />
            <datalist id="trick-presets">
              {TRICK_PRESETS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>

          {/* CAPTION */}
          <div className="mt-5">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">
              Caption <span className="text-zinc-700 normal-case tracking-normal">(optional)</span>
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="First try, mistře..."
              rows={2}
              maxLength={280}
              data-testid="trick-caption"
              className="w-full bg-black text-white border border-zinc-800 focus:border-[#D2FF00] focus:outline-none rounded-none p-3 text-sm resize-none transition-colors"
            />
          </div>

          {/* TAGS */}
          <div className="mt-5">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2 flex items-center gap-1">
              <AtSign size={11} /> Tag riders <span className="text-zinc-700 normal-case tracking-normal">(comma-sep)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="kfly, bones, purple_thang"
              maxLength={200}
              data-testid="trick-tags"
              className="w-full bg-black text-white border border-zinc-800 focus:border-[#D2FF00] focus:outline-none rounded-none h-11 px-3 text-sm transition-colors"
            />
          </div>

          {error && (
            <div data-testid="trick-error" className="mt-4 text-[#FF3366] text-xs uppercase tracking-wider font-bold border border-[#FF3366]/30 bg-[#FF3366]/5 p-3">
              {error}
            </div>
          )}

          {submitting && progress > 0 && (
            <div className="mt-4">
              <div className="h-1 bg-zinc-900">
                <div className="h-full bg-[#D2FF00] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">Uploading {progress}%</div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting || !videoFile || !trickName.trim() || duration < 1 || duration > MAX_SECONDS}
            data-testid="trick-submit"
            className="w-full mt-6 bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:opacity-40 disabled:cursor-not-allowed font-black uppercase tracking-widest rounded-none h-12 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (<><Loader2 size={16} className="animate-spin" /> Landing...</>) : 'Land it · +5 DFQ →'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrickUploadModal;