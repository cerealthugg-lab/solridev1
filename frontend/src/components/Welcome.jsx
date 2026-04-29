import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Coins, Cpu, ArrowRight } from "lucide-react";

const Section = ({ icon: Icon, eyebrow, title, accent, children }) => (
  <div
    data-testid={`welcome-section-${eyebrow.toLowerCase().replace(/\s+/g, "-")}`}
    className="border-t border-zinc-900 py-8 md:py-10"
  >
    <div className="flex items-start gap-4 md:gap-6">
      <div
        className="flex h-11 w-11 md:h-12 md:w-12 shrink-0 items-center justify-center border border-zinc-800"
        style={{ background: accent ? `${accent}1A` : "transparent" }}
      >
        <Icon size={20} style={{ color: accent || "#EDEDED" }} strokeWidth={2} />
      </div>
      <div className="flex-1">
        <span className="text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-zinc-500 font-bold">
          {eyebrow}
        </span>
        <h3 className="mt-1.5 text-2xl md:text-3xl text-white font-black uppercase tracking-tight leading-tight">
          {title}
        </h3>
        <div className="mt-3 text-sm md:text-base leading-relaxed text-zinc-400">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const Welcome = () => {
  const navigate = useNavigate();

  const goAuth = (mode) => {
    localStorage.setItem("solride.welcomeSeen", "true");
    navigate(`/auth?mode=${mode}`);
  };

  useEffect(() => {
    if (localStorage.getItem("token")) navigate("/", { replace: true });
  }, [navigate]);

  return (
    // Fixed fullscreen overlay — breaks out of any parent max-w container
    <div
      data-testid="welcome-screen"
      className="fixed inset-0 bg-[#09090b] text-[#EDEDED] font-sans selection:bg-[#D2FF00] selection:text-black overflow-y-auto"
    >
      {/* Top gradient accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D2FF00] to-[#FF3366] z-50" />

      {/* Skip link top-right */}
      <button
        data-testid="welcome-skip-button"
        onClick={() => goAuth("login")}
        className="fixed top-4 right-4 z-40 text-[10px] tracking-[0.2em] uppercase text-zinc-500 hover:text-white font-bold py-2"
      >
        Skip →
      </button>

      {/* Single responsive column — gets wider and roomier on bigger screens */}
      <main className="mx-auto max-w-md sm:max-w-lg lg:max-w-2xl px-6 sm:px-8 lg:px-12 pt-14 pb-12">
        {/* Hero */}
        <section
          data-testid="welcome-hero"
          className="flex flex-col items-center text-center pt-10 sm:pt-14 lg:pt-20 pb-12 sm:pb-16"
        >
          <h1
            data-testid="welcome-headline"
            className="text-7xl sm:text-8xl lg:text-9xl font-black italic tracking-tighter mb-3 sm:mb-4 bg-gradient-to-br from-[#D2FF00] to-[#ffffff] bg-clip-text text-transparent leading-none pr-3 sm:pr-4 lg:pr-6"
          >
            SOLRIDE
          </h1>
          <p className="text-zinc-500 uppercase tracking-[0.25em] text-[11px] sm:text-xs lg:text-sm font-bold">
            Ride. Track. Earn.
          </p>
        </section>

        {/* Sections */}
        <Section
          icon={Compass}
          eyebrow="How it works"
          title="Ride. Skate. Connect."
        >
          Open the app, find a ride or hit the streets on your board. Every
          trip is logged, every move is part of the network. The further you
          go, the more the world opens up.
        </Section>

        <Section
          icon={Coins}
          eyebrow="The currency"
          title="Earn DFQ in motion"
          accent="#A855F7"
        >
          <p>
            DFQ is solride's in-app currency. You earn it by{" "}
            <span className="text-white font-bold">being in motion</span> —
            every kilometer ridden, every trick landed on your skateboard,
            every connection made on the road.
          </p>
          <p className="mt-3">
            Send DFQ to any rider. Trade it for anything inside the app.
            Frictionless, peer-to-peer. Solana ecosystem integration arriving —
            once it lands, DFQ steps fully on-chain.
          </p>
        </Section>

        <Section
          icon={Cpu}
          eyebrow="The hardware"
          title="Smart skateboard, smart risers."
        >
          We're building it: the SOLRIDE smart skateboard tool and GPS smart
          risers. Hardware that bridges your ride to the network — your board
          becomes the wallet, the sensor, the antenna. The final piece of the
          journey, in production.
        </Section>

        {/* CTAs — stacked on mobile, side-by-side on bigger screens */}
        <section
          data-testid="welcome-cta-section"
          className="mt-10 lg:mt-14 flex flex-col sm:flex-row gap-3 sm:gap-4"
        >
          <button
            data-testid="welcome-login-button"
            onClick={() => goAuth("login")}
            className="flex-1 bg-[#D2FF00] text-black hover:bg-[#c2eb00] font-black uppercase tracking-widest rounded-none h-14 lg:h-16 text-base flex items-center justify-center gap-3 transition-colors"
          >
            Login
            <ArrowRight size={18} strokeWidth={5} />
          </button>
          <button
            data-testid="welcome-register-button"
            onClick={() => goAuth("register")}
            className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-black uppercase tracking-widest rounded-none h-14 lg:h-16 text-base flex items-center justify-center gap-3 transition-colors"
          >
            Register
            <ArrowRight size={18} strokeWidth={5} />
          </button>
        </section>

        <footer
          data-testid="welcome-footer"
          className="mt-14 lg:mt-20 pb-4 text-center"
        >
          <span className="text-[10px] tracking-[0.25em] uppercase text-zinc-600 font-bold">
            SOLRIDE © 2026
          </span>
        </footer>
      </main>
    </div>
  );
};

export default Welcome;