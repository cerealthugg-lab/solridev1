import React, { useState, useEffect, useRef } from 'react';
import { X, Video, Loader2, AtSign, Trash2, MapPin, Move } from 'lucide-react';
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
const QUICK_PICKS = TRICK_PRESETS.slice(0, 8);

const MAX_SECONDS = 15;

const fieldClass =
  'w-full bg-neutral-900/80 text-white border border-neutral-800 focus:border-[#D2FF00]/50 outline-none rounded-xl px-4 text-base transition-colors placeholder:text-neutral-600';

const Label = ({ children, hint }) => (
  <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mb-2">
    {children}
    {hint && <span className="font-normal text-neutral-600">{hint}</span>}
  </label>
);

function TrickUploadModal({ open, onClose, spot, onUploaded }) {
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [videoW, setVideoW] = useState(0);
  const [videoH, setVideoH] = useState(0);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
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
      setVideoW(0); setVideoH(0); setCropX(50); setCropY(50);
      setTrickName(''); setCaption(''); setTags('');
      setError(''); setProgress(0); setSubmitting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [open]);

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  if (!open) return null;

  const clearVideo = () => {
    setVideoFile(null); setVideoUrl(null); setDuration(0); setVideoW(0); setVideoH(0);
    setCropX(50); setCropY(50); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const pickVideo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setError('Video too big (max 50MB)'); return; }
    setError('');
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(f);
    setVideoFile(f);
    setVideoUrl(url);
    setCropX(50); setCropY(50);

    const probeUrl = URL.createObjectURL(f);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      const d = v.duration || 0;
      setDuration(d);
      setVideoW(v.videoWidth || 0);
      setVideoH(v.videoHeight || 0);
      if (d > MAX_SECONDS + 0.5) {
        setError(`Clip is ${d.toFixed(1)}s, max is ${MAX_SECONDS}s. Trim it first.`);
      }
      URL.revokeObjectURL(probeUrl);
    };
    v.src = probeUrl;
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
    fd.append('crop_x', String(Math.round(cropX)));
    fd.append('crop_y', String(Math.round(cropY)));

    try {
      const res = await api.post('/tricks', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      toast.success(`Trick landed! +${res.data.earned} DFQ`);
      onUploaded?.(res.data.trick);
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && videoFile && trickName.trim() && duration >= 1 && duration <= MAX_SECONDS;

  return (
    <div
      data-testid="trick-upload-modal"
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#09090b] border border-neutral-800 rounded-t-3xl sm:rounded-3xl relative max-h-[94vh] overflow-y-auto shadow-2xl shadow-black"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-[#D2FF00]/10 blur-3xl pointer-events-none" />

        <div className="sticky top-0 z-10 bg-[#09090b]/90 backdrop-blur-xl px-5 pt-3 pb-4 border-b border-neutral-900">
          <div className="mx-auto w-10 h-1 rounded-full bg-neutral-800 mb-3 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D2FF] truncate max-w-full">
                <MapPin size={12} /> {spot?.name || 'This spot'}
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white leading-tight">Land a trick</h2>
            </div>
            <button
              onClick={onClose}
              data-testid="trick-upload-close"
              className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-[#D2FF00]/10 text-[#D2FF00] text-[11px] font-semibold">+5 DFQ per clip</span>
            <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-neutral-900 text-neutral-400 text-[11px] font-semibold">5 a day max</span>
            <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-neutral-900 text-neutral-400 text-[11px] font-semibold">Up to {MAX_SECONDS}s</span>
          </div>
        </div>

        <div className="relative px-5 pt-5 pb-5 space-y-5">
          <div>
            <input ref={fileRef} type="file" accept="video/*" onChange={pickVideo} data-testid="trick-video-input" className="hidden" />

            {videoUrl ? (
              <div>
                <div className="relative rounded-2xl border border-neutral-800 aspect-square bg-black overflow-hidden">
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    muted
                    className="w-full h-full bg-black"
                    style={{ objectFit: 'cover', objectPosition: `${cropX}% ${cropY}%` }}
                  />
                  <button
                    onClick={clearVideo}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 backdrop-blur-md text-white hover:text-[#FF3366] flex items-center justify-center transition-colors"
                    data-testid="trick-video-clear"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                  {duration > 0 && (
                    <div
                      data-testid="trick-video-duration"
                      className={`absolute top-3 left-3 px-2.5 h-7 inline-flex items-center rounded-full backdrop-blur-md text-xs font-semibold ${duration > MAX_SECONDS ? 'bg-[#FF3366]/80 text-white' : 'bg-black/70 text-white'}`}
                    >
                      {duration.toFixed(1)}s · 1:1
                    </div>
                  )}
                </div>

                {videoW > 0 && videoH > 0 && videoW !== videoH && (
                  <div className="mt-3 rounded-2xl bg-neutral-950 border border-neutral-800 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mb-2">
                      <Move size={12} /> Adjust framing
                    </div>
                    {videoW > videoH ? (
                      <input
                        type="range" min="0" max="100" value={cropX}
                        onChange={(e) => setCropX(Number(e.target.value))}
                        data-testid="trick-crop-x"
                        className="w-full accent-[#D2FF00]"
                        aria-label="Horizontal framing"
                      />
                    ) : (
                      <input
                        type="range" min="0" max="100" value={cropY}
                        onChange={(e) => setCropY(Number(e.target.value))}
                        data-testid="trick-crop-y"
                        className="w-full accent-[#D2FF00]"
                        aria-label="Vertical framing"
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                data-testid="trick-video-pick"
                className="group w-full rounded-2xl border border-dashed border-neutral-700 hover:border-[#D2FF00]/60 bg-neutral-950 aspect-[4/3] flex flex-col items-center justify-center gap-3 transition-colors active:scale-[0.99]"
              >
                <div className="w-14 h-14 rounded-full bg-[#D2FF00]/10 text-[#D2FF00] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Video size={24} />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold text-white">Record or upload a clip</span>
                  <span className="block text-xs text-neutral-500 mt-0.5">Max {MAX_SECONDS} seconds · 50MB</span>
                </div>
              </button>
            )}
            <p className="text-[11px] text-neutral-600 mt-2">Any format works. SOLRIDE converts your clip so it plays on every phone and browser.</p>
          </div>

          <div>
            <Label>Trick name</Label>
            <input
              value={trickName}
              onChange={(e) => setTrickName(e.target.value)}
              placeholder="Kickflip, 360 flip, Bluntslide..."
              maxLength={60}
              list="trick-presets"
              data-testid="trick-name-input"
              className={`${fieldClass} h-12`}
            />
            <datalist id="trick-presets">
              {TRICK_PRESETS.map((t) => <option key={t} value={t} />)}
            </datalist>
            <div className="mt-2 flex gap-2 overflow-x-auto -mx-5 px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
              {QUICK_PICKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrickName(t)}
                  data-testid={`trick-preset-${t.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`shrink-0 px-3 h-9 rounded-full border text-xs font-semibold transition-colors ${trickName === t ? 'bg-[#D2FF00]/15 border-[#D2FF00]/50 text-[#D2FF00]' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label hint="optional">Caption</Label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="First try..."
              rows={2}
              maxLength={280}
              data-testid="trick-caption"
              className={`${fieldClass} py-3 resize-none`}
            />
          </div>

          <div>
            <Label hint="comma separated"><AtSign size={12} /> Tag riders</Label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="kfly, bones, purple_thang"
              maxLength={200}
              autoCapitalize="off"
              autoCorrect="off"
              data-testid="trick-tags"
              className={`${fieldClass} h-12`}
            />
          </div>

          {error && (
            <div data-testid="trick-error" className="rounded-xl text-[#FF3366] text-sm font-medium border border-[#FF3366]/30 bg-[#FF3366]/10 px-4 py-3">
              {error}
            </div>
          )}

          {submitting && progress > 0 && (
            <div data-testid="trick-upload-progress">
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full rounded-full bg-[#D2FF00] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="text-xs text-neutral-500 mt-1.5">
                {progress < 100 ? `Uploading ${progress}%` : 'Converting your clip...'}
              </div>
            </div>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit}
            data-testid="trick-submit"
            className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:opacity-40 disabled:cursor-not-allowed font-semibold tracking-wide rounded-full h-14 text-base shadow-[0_0_24px_rgba(210,255,0,0.15)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (<><Loader2 size={18} className="animate-spin" /> Landing...</>) : 'Land it · +5 DFQ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TrickUploadModal;