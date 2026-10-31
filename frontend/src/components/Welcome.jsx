import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Coins, Cpu, ArrowRight, MapPin, Flame, Wallet, MessageCircle } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

const FEATURES = [
  { icon: MapPin, label: "Spots map", color: "#00D2FF" },
  { icon: Flame, label: "Trick feed", color: "#FF3366" },
  { icon: Wallet, label: "DFQ wallet", color: "#D2FF00" },
  { icon: MessageCircle, label: "Rider chat", color: "#A855F7" },
];

const Section = ({ icon: Icon, eyebrow, title, accent = "#D2FF00", children }) => (
  <div
    data-testid={`welcome-section-${eyebrow.toLowerCase().replace(/\s+/g, "-")}`}
    className="relative overflow-hidden rounded-2xl bg-neutral-950 border border-neutral-800 p-5 sm:p-6"
  >
    <div className="absolute -top-16 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: `${accent}1A` }} />
    <div className="relative flex items-start gap-4">
      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold" style={{ color: accent }}>{eyebrow}</span>
        <h3 className="mt-0.5 text-xl sm:text-2xl text-white font-black tracking-tight leading-tight">{title}</h3>
        <div className="mt-2 text-sm leading-relaxed text-neutral-400 space-y-3">{children}</div>
      </div>
    </div>
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const goAuth = (mode) => navigate(`/auth?mode=${mode}`);

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/", { replace: true });
  }, [navigate]);

  return (
    <div data-testid="welcome-screen" className="fixed inset-0 bg-[#09090b] text-[#EDEDED] font-sans selection:bg-[#D2FF00] selection:text-black overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366] z-50" />
      <div className="absolute -top-40 -left-32 w-[420px] h-[420px] rounded-full bg-[#D2FF00]/10 blur-3xl pointer-events-none" />
      <div className="absolute top-[420px] -right-40 w-[380px] h-[380px] rounded-full bg-[#FF3366]/10 blur-3xl pointer-events-none" />

      <button data-testid="welcome-skip-button" onClick={() => goAuth("login")}
        className="fixed z-40 right-4 lg:right-8 px-4 h-9 rounded-full bg-neutral-900/80 backdrop-blur-md border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
        style={{ top: "calc(env(safe-area-inset-top) + 12px)" }}>
        Skip
      </button>

      {/* Phone: one column. Laptop (lg, 1024px+): hero pinned on the left, content scrolls on the right */}
      <main className="relative mx-auto max-w-md sm:max-w-lg lg:max-w-6xl px-5 sm:px-8 lg:px-12 lg:grid lg:grid-cols-2 lg:gap-16 lg:items-start"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 64px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <section data-testid="welcome-hero" className="pb-10 lg:pb-0 lg:sticky lg:top-24">
          <span className="inline-flex items-center gap-2 px-3 h-7 rounded-full bg-[#D2FF00]/10 border border-[#D2FF00]/20 text-[11px] font-semibold text-[#D2FF00]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D2FF00] animate-pulse" /> Skate social · Move to earn
          </span>
          <h1 data-testid="welcome-headline" className="mt-5 text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black italic tracking-tighter bg-gradient-to-br from-[#D2FF00] to-[#ffffff] bg-clip-text text-transparent leading-none pr-3">
            SOLRIDE
          </h1>
          <p className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Ride more.<br /><span className="text-neutral-500">Stack DFQ.</span>
          </p>
          <p className="mt-3 text-sm sm:text-base lg:text-lg text-neutral-400 leading-relaxed max-w-sm lg:max-w-md">
            Track your rides, drop tricks, find spots and link up with skaters near you.
          </p>
          <div className="mt-6 flex gap-2 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 pb-1" style={{ scrollbarWidth: "none" }}>
            {FEATURES.map(({ icon: Icon, label, color }) => (
              <span key={label} className="shrink-0 inline-flex items-center gap-2 px-3 h-9 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs font-semibold text-neutral-300">
                <Icon size={14} style={{ color }} /> {label}
              </span>
            ))}
          </div>
        </section>

        <div data-testid="welcome-content-column">
          <div className="space-y-3">
            <Section icon={Compass} eyebrow="How it works" title="Ride. Skate. Connect.">
              <p>Open the app, find a ride or hit the streets on your board. Every trip is logged, every move is part of the network. The further you go, the more the world opens up.</p>
            </Section>
            <Section icon={Coins} eyebrow="The currency" title="Earn DFQ in motion" accent="#A855F7">
              <p>DFQ is SOLRIDE's in-app currency. You earn it by <span className="text-white font-semibold">being in motion</span>: every kilometer ridden, every trick landed, every connection made on the road.</p>
              <p>Send DFQ to any rider as a tip, spend it on new spots and tricks. DFQ are fun in-app points: they have no cash value and can't be bought or withdrawn.</p>
            </Section>
            <Section icon={Cpu} eyebrow="The hardware" title="Smart skateboard, smart risers." accent="#00D2FF">
              <p>We're building it: the SOLRIDE shuriken skateboard tool, already in prototype, and GPS smart risers. Hardware that bridges your ride to the network: your board becomes the wallet, the sensor, the antenna.</p>
            </Section>
          </div>

          <section data-testid="welcome-cta-section" className="mt-8 space-y-3">
            <button data-testid="welcome-register-button" onClick={() => goAuth("register")}
              className="w-full bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-semibold tracking-wide rounded-full h-14 text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(210,255,0,0.18)] active:scale-[0.98] transition-all">
              Create account <ArrowRight size={18} strokeWidth={2.5} />
            </button>
            <button data-testid="welcome-login-button" onClick={() => goAuth("login")}
              className="w-full bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-800 font-semibold tracking-wide rounded-full h-14 text-base flex items-center justify-center active:scale-[0.98] transition-all">
              I already have an account
            </button>
          </section>

          <footer data-testid="welcome-footer" className="mt-10 flex flex-col items-center gap-2">
            <button data-testid="welcome-contact-button" onClick={() => setFeedbackOpen(true)} className="text-xs font-semibold text-neutral-500 hover:text-[#D2FF00] py-2 transition-colors">
              Contact · Drop feedback
            </button>
            <span className="text-[10px] tracking-[0.25em] uppercase text-neutral-600">SOLRIDE © 2026</span>
          </footer>
        </div>
      </main>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
};

export default Welcome;