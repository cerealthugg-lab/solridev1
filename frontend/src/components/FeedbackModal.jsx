import React, { useState, useEffect } from "react";
import { X, Send, Terminal } from "lucide-react";

const ISSUE_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "lag", label: "Lag" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

const FEEDBACK_EMAIL = "cerealthugg@gmail.com";

const FeedbackModal = ({ open, onClose }) => {
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const subject = `[solride] \${ISSUE_TYPES.find(t => t.value === type)?.label || type}`;
    const body = [
      `Message:`, message,
      `Type: \${type}`,
      `From: \${email || "anonymous skater"}`,
      `Device: \${navigator.userAgent}`,
      `Screen: window.innerWidth×{window.innerHeight}`,
      `Time: \${new Date().toISOString()}`,
      ``,
    ].join("\n");
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage(""); setEmail(""); setType("bug");
    onClose();
  };

  return (
    <div
      data-testid="feedback-modal"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md px-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* iOS Style Action Sheet Container Card */}
      <div
        className="w-full max-w-md bg-zinc-950 border border-neutral-900 rounded-t-3xl sm:rounded-3xl overflow-hidden relative shadow-2xl pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sleek top brand accent border bar strip */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-[#D2FF00] via-yellow-400 to-[#FF3366]" />
        
        <button
          data-testid="feedback-close"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white p-2 rounded-full bg-neutral-900/40 active:scale-90 transition-transform"
          aria-label="Close feedback"
        >
          <X size={16} />
        </button>

        <form onSubmit={handleSubmit} className="p-6 pt-8 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-[#D2FF00]" />
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Drop basecamp a report</h2>
            </div>
            <p className="text-[10px] text-neutral-500 mt-0.5 uppercase tracking-widest font-extrabold">Spotted a bug? Got a sick update idea?</p>
          </div>

          {/* Toggle Type Selector Pills Matrix */}
          <div>
            <label className="block text-[9px] tracking-widest uppercase text-neutral-500 font-black mb-2">Select category</label>
            <div className="grid grid-cols-4 gap-1.5 bg-neutral-900/40 p-1 rounded-xl border border-neutral-900/60">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  data-testid={`feedback-type-${t.value}`}
                  onClick={() => setType(t.value)}
                  className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                    type === t.value
                      ? "bg-[#D2FF00] text-black font-extrabold shadow-md scale-100"
                      : "bg-transparent text-neutral-400 font-bold hover:text-white active:scale-98"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email input field */}
          <div className="space-y-1.5">
            <label className="block text-[9px] tracking-widest uppercase text-neutral-500 font-black">
              Your contact mail <span className="text-neutral-600 font-medium normal-case tracking-normal">(optional)</span>
            </label>
            <input
              data-testid="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="skater@solride.app"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-black text-white border border-neutral-900 focus:border-[#D2FF00]/40 focus:outline-none rounded-xl h-10 px-3.5 text-sm transition-colors font-medium"
            />
          </div>

          {/* Message input field */}
          <div className="space-y-1.5">
            <label className="block text-[9px] tracking-widest uppercase text-neutral-500 font-black">Report metrics</label>
            <textarea
              data-testid="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the lag, setup issues, or what accessories you want added to the store..."
              rows={4}
              className="w-full bg-black text-white border border-neutral-900 focus:border-[#D2FF00]/40 focus:outline-none rounded-xl p-3.5 text-sm resize-none transition-colors font-medium leading-relaxed"
              required
            />
          </div>

          {/* Shutter styled activation submit button */}
          <div className="pt-2">
            <button
              data-testid="feedback-submit"
              type="submit"
              disabled={!message.trim()}
              className="w-full h-11 bg-[#D2FF00] text-black disabled:opacity-30 font-black uppercase tracking-widest rounded-xl text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Send size={11} className="stroke-[2.5]" />
              Transmit Report
            </button>
            <p className="text-[9px] text-neutral-600 text-center mt-2.5 uppercase tracking-wider font-bold">
              Securely bundles system logs & opens mail client
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
