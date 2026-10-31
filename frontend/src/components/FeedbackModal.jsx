import React, { useState, useEffect } from "react";
import { X, Send, Bug, Gauge, Lightbulb, MessageSquare, Mail } from "lucide-react";

const ISSUE_TYPES = [
  { value: "bug", label: "Bug", icon: Bug, color: "#FF3366" },
  { value: "lag", label: "Lag", icon: Gauge, color: "#FF9900" },
  { value: "idea", label: "Idea", icon: Lightbulb, color: "#D2FF00" },
  { value: "other", label: "Other", icon: MessageSquare, color: "#00D2FF" },
];

const FEEDBACK_EMAIL = "cerealthugg@gmail.com";
const MAX_LEN = 1000;

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

  const current = ISSUE_TYPES.find((t) => t.value === type) || ISSUE_TYPES[0];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const subject = `[SOLRIDE] ${current.label}`;
    const body = [
      "Message:", message.trim(), "",
      `Type: ${type}`,
      `From: ${email.trim() || "anonymous skater"}`,
      `Device: ${navigator.userAgent}`,
      `Screen: ${window.innerWidth}x${window.innerHeight}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage(""); setEmail(""); setType("bug");
    onClose();
  };

  return (
    <div
      data-testid="feedback-modal"
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#09090b] border border-neutral-800 rounded-t-3xl sm:rounded-3xl relative max-h-[94vh] overflow-y-auto shadow-2xl shadow-black"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none transition-colors duration-300"
          style={{ backgroundColor: `${current.color}1A` }}
        />

        <form onSubmit={handleSubmit} className="relative px-5 pt-3 pb-5 space-y-5">
          <div className="mx-auto w-10 h-1 rounded-full bg-neutral-800 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#D2FF00]">Feedback</span>
              <h2 className="text-2xl font-black tracking-tight text-white leading-tight">Talk to the crew</h2>
              <p className="text-sm text-neutral-500 mt-1">Spotted a bug or got an idea? We read every message.</p>
            </div>
            <button
              type="button"
              data-testid="feedback-close"
              onClick={onClose}
              aria-label="Close feedback"
              className="w-10 h-10 shrink-0 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">What's it about?</label>
            <div className="grid grid-cols-4 gap-2">
              {ISSUE_TYPES.map((t) => {
                const Icon = t.icon;
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    data-testid={`feedback-type-${t.value}`}
                    onClick={() => setType(t.value)}
                    className={`h-16 rounded-2xl border flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors active:scale-[0.97] ${active ? "text-white" : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-white"}`}
                    style={active ? { backgroundColor: `${t.color}1f`, borderColor: `${t.color}80` } : undefined}
                  >
                    <Icon size={18} style={{ color: active ? t.color : undefined }} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-2">Message</label>
            <textarea
              data-testid="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              placeholder={type === "idea" ? "What should we add to SOLRIDE?" : "What happened, and on which screen?"}
              rows={4}
              required
              className="w-full bg-neutral-900/80 text-white border border-neutral-800 focus:border-[#D2FF00]/50 outline-none rounded-xl px-4 py-3 text-base resize-none transition-colors leading-relaxed placeholder:text-neutral-600"
            />
            <div className="text-right text-[11px] text-neutral-600 mt-1" data-testid="feedback-char-count">{message.length}/{MAX_LEN}</div>
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 mb-2">
              Your email <span className="font-normal text-neutral-600">optional, if you want a reply</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                data-testid="feedback-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="email"
                className="w-full h-12 bg-neutral-900/80 text-white border border-neutral-800 focus:border-[#D2FF00]/50 outline-none rounded-xl pl-11 pr-4 text-base transition-colors placeholder:text-neutral-600"
              />
            </div>
          </div>

          {/* Submit */}
          <div>
            <button
              data-testid="feedback-submit"
              type="submit"
              disabled={!message.trim()}
              className="w-full h-14 bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:opacity-40 disabled:cursor-not-allowed font-semibold tracking-wide rounded-full text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(210,255,0,0.15)] active:scale-[0.98] transition-all"
            >
              <Send size={16} /> Send feedback
            </button>
            <p className="text-[11px] text-neutral-600 text-center mt-2">Opens your mail app with the message and device info ready to send.</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;