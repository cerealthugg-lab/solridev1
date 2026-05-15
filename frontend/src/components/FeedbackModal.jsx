import { useState, useEffect } from "react";
import { X } from "lucide-react";

const ISSUE_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "lag", label: "Lag / Performance" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

const FEEDBACK_EMAIL = "cerealthugg@gmail.com"; // ← change to your real inbox

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
    const subject = `[solride] ${ISSUE_TYPES.find(t => t.value === type)?.label || type}`;
    const body = [
      `Type: ${type}`,
      `From: ${email || "anonymous skater"}`,
      `Device: ${navigator.userAgent}`,
      `Screen: ${window.innerWidth}×${window.innerHeight}`,
      `Time: ${new Date().toISOString()}`,
      ``, `Message:`, message,
    ].join("\n");
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setMessage(""); setEmail(""); setType("bug");
    onClose();
  };

  return (
    <div
      data-testid="feedback-modal"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#09090b] border border-zinc-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366]" />
        <button
          data-testid="feedback-close"
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white p-2"
          aria-label="Close feedback"
        >
          <X size={18} />
        </button>
        <form onSubmit={handleSubmit} className="p-6 pt-8">
          <h2 className="text-xl font-black uppercase tracking-tight text-white">Drop us a line</h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-[0.2em] font-bold">Spotted a bug? Got an idea?</p>

          <div className="mt-6">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  data-testid={`feedback-type-${t.value}`}
                  onClick={() => setType(t.value)}
                  className={`h-10 px-3 text-xs font-black uppercase tracking-widest border transition-colors ${
                    type === t.value
                      ? "bg-[#D2FF00] text-black border-[#D2FF00]"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-700"
                  }`}
                >{t.label}</button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">
              Email <span className="text-zinc-700 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              data-testid="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@solride.app"
              autoCapitalize="off"
              autoCorrect="off"
              className="w-full bg-black text-white border border-zinc-800 focus:border-[#D2FF00] focus:outline-none rounded-none h-11 px-3 text-base transition-colors"
            />
          </div>

          <div className="mt-5">
            <label className="block text-[10px] tracking-[0.25em] uppercase text-zinc-500 font-bold mb-2">Message</label>
            <textarea
              data-testid="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what happened, what you'd love to see, anything..."
              rows={5}
              className="w-full bg-black text-white border border-zinc-800 focus:border-[#D2FF00] focus:outline-none rounded-none p-3 text-base resize-none transition-colors"
              required
            />
          </div>

          <button
            data-testid="feedback-submit"
            type="submit"
            disabled={!message.trim()}
            className="w-full mt-6 bg-[#D2FF00] text-black hover:bg-[#c2eb00] disabled:opacity-40 disabled:cursor-not-allowed font-black uppercase tracking-widest rounded-none h-12 text-base transition-colors"
          >Send →</button>

          <p className="text-[10px] text-zinc-600 text-center mt-4 uppercase tracking-[0.2em] font-bold">
            Opens your mail app
          </p>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;