"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ECGLine } from "../components/ECGLine";

const MotionDiv = dynamic(() => import("framer-motion").then((m) => m.motion.div), { ssr: false });
const MotionSpan = dynamic(() => import("framer-motion").then((m) => m.motion.span), { ssr: false });
const MotionPath = dynamic(() => import("framer-motion").then((m) => m.motion.path), { ssr: false });

const stats = [
  { value: 3.9, label: "LOW RISK", color: "#4ADE80" },
  { value: 6.9, label: "MODERATE", color: "#FBBF24" },
  { value: 8.9, label: "HIGH RISK", color: "#F87171" },
  { value: 9.0, label: "EMERGENCY", color: "#FF0A0A", suffix: "+" },
];

const steps = [
  {
    title: "Describe what you feel",
    body:
      "Type it in plain English or tap from our symptom list. Our system reads your words and identifies the clinical terms.",
    number: "01",
  },
  {
    title: "Your profile shapes the score",
    body:
      "Age, conditions, history — the same symptom means something different for different people. Vital knows that.",
    number: "02",
    meteors: true,
  },
  {
    title: "Get a clear recommendation",
    body:
      "Not a list of possibilities. A score, a level, and one instruction: monitor, see a doctor, go to the ER, or call 911.",
    number: "03",
  },
];

const features = [
  {
    tag: "PANIC DETECTION",
    title: "It knows when you're scared.",
    body:
      "When stress is high but symptoms are mild, Vital detects the mismatch. It leads with calm context before showing your score.",
  },
  {
    tag: "EMERGENCY ALERTS",
    title: "Someone who cares gets notified.",
    body:
      "Add one emergency contact. If Vital detects a red-flag symptom, your contact gets a message before you even close the app.",
  },
  {
    tag: "TREND TRACKING",
    title: "Patterns you would never notice.",
    body:
      "Vital tracks every session. When your stress rises every Tuesday, you see it in the timeline before your body tells you again.",
  },
];

export default function LandingPage() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return (
    <SmoothScroll>
      <main className="vital-noir">
        <style jsx global>{`
          @import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,400;1,600&family=Syne:wght@600;700;800&family=IBM+Plex+Serif:wght@300;400&family=Martian+Mono:wght@400;500&display=swap");

          :root {
            --bg: #060810;
            --surface: #0c1120;
            --elevated: #131929;
            --border: #1e2a40;
            --text: #d8e4f0;
            --muted: #5c7a99;
            --dim: #2e4560;
            --cyan: #00c9ff;
            --cyan-dim: rgba(0, 201, 255, 0.08);
            --green: #4ade80;
            --amber: #fbbf24;
            --red: #f87171;
            --emergency: #ff0a0a;
          }

          html,
          body {
            background: var(--bg);
            color: var(--text);
            font-family: "IBM Plex Serif", serif;
          }

          .hero-badge {
            font-family: "Syne", sans-serif;
            letter-spacing: 0.2em;
          }

          .hero-title {
            font-family: "Cormorant Garamond", serif;
            font-style: italic;
          }

          .heading {
            font-family: "Syne", sans-serif;
          }

          .mono {
            font-family: "Martian Mono", monospace;
          }

          @keyframes auroraShift {
            0% {
              transform: translate3d(0, 0, 0) scale(1);
            }
            50% {
              transform: translate3d(-2%, 2%, 0) scale(1.05);
            }
            100% {
              transform: translate3d(0, 0, 0) scale(1);
            }
          }

          @keyframes shimmerMove {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 200% 50%;
            }
          }

          @keyframes borderSpin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          @keyframes bounceDown {
            0%,
            100% {
              transform: translateY(0);
            }
            50% {
              transform: translateY(6px);
            }
          }

          @keyframes dividerPulse {
            0%,
            100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.8;
            }
          }

          @keyframes meteor {
            0% {
              transform: translate3d(0, 0, 0);
              opacity: 0;
            }
            10% {
              opacity: 0.6;
            }
            100% {
              transform: translate3d(140px, 60px, 0);
              opacity: 0;
            }
          }

          @keyframes spark {
            0%,
            100% {
              opacity: 0.2;
              transform: scale(1);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.2);
            }
          }
        `}</style>

        <FloatingNav />

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-0">
          <AuroraBackdrop />
          <Spotlight />
          <NoiseOverlay />
          <ECGLine />

          <div className="relative z-10 flex w-full max-w-5xl flex-col items-center px-6 text-center">
            <MotionDiv
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="hero-badge rounded-full border border-[rgba(0,201,255,0.3)] bg-[rgba(0,201,255,0.06)] px-4 py-2 text-[10px] uppercase text-[var(--cyan)]"
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--cyan)]" />
              AI-POWERED HEALTH GUIDANCE
            </MotionDiv>

            <TextGenerateEffect text="Know when to act." />

            <TypewriterText
              text="Vital analyzes your symptoms against your health profile and tells you exactly how urgent your situation is."
              className="mt-4 max-w-xl text-[18px] font-light text-[var(--muted)]"
              delay={900}
            />

            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <MovingBorderButton href="/sign-in?redirect_url=/post-auth" label="Get Started ->" />
              <button
                className="heading rounded-full border border-[var(--border)] px-6 py-3 text-[12px] uppercase tracking-[0.15em] text-[var(--muted)] transition hover:border-[#2e4060] hover:text-[var(--text)]"
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                See how it works v
              </button>
            </MotionDiv>
          </div>

          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 0.4 }}
            className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--dim)]"
          >
            <div className="mono text-[9px]">SCROLL</div>
            <div className="h-4 w-px bg-[var(--dim)]" />
            <div className="mono text-[10px]" style={{ animation: "bounceDown 2s infinite" }}>
              v
            </div>
          </MotionDiv>
        </section>

        <StatsBar prefersReducedMotion={prefersReducedMotion} />

        <section id="how-it-works" className="relative px-6 py-28">
          <div className="mx-auto max-w-5xl text-center">
            <p className="heading text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">THE PROCESS</p>
            <h2 className="hero-title mt-4 text-[48px] text-[var(--text)]">Three steps. One answer.</h2>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-6 lg:grid-cols-3">
            {steps.map((step, index) => (
              <WobbleCard key={step.title} delay={index * 0.15}>
                <div className="flex items-start justify-between">
                  <div className="mono text-[48px] text-[rgba(0,201,255,0.2)]">{step.number}</div>
                  {step.meteors ? <MeteorField /> : null}
                </div>
                <h3 className="heading mt-4 text-[20px] text-[var(--text)]">{step.title}</h3>
                <p className="mt-3 text-[15px] text-[var(--muted)]">{step.body}</p>
              </WobbleCard>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-5xl">
            <svg className="w-full" height="40">
              <MotionPath
                d="M 20 20 L 980 20"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1.4 }}
              />
              <defs>
                <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#1e2a40" />
                  <stop offset="50%" stopColor="#00c9ff" />
                  <stop offset="100%" stopColor="#1e2a40" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </section>

        <section className="relative px-6 py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} flip={index % 2 === 1} />
            ))}
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-6 py-24">
          <BackgroundBeams />
          <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
            <p className="heading text-[10px] uppercase tracking-[0.25em] text-[var(--dim)]">READY?</p>
            <TextGenerateEffect text="Your health deserves a second opinion." size="56px" />
            <p className="mt-4 text-[16px] font-light text-[var(--muted)]">
              Free to use. No diagnosis. No judgment. Just clarity.
            </p>
            <div className="relative mt-10">
              <Sparkles />
              <MovingBorderButton href="/sign-in?redirect_url=/post-auth" label="Start your first assessment ->" large />
            </div>
            <div className="mono mt-8 flex flex-wrap items-center justify-center gap-4 text-[10px] text-[var(--dim)]">
              <span>🔒 Private by design</span>
              <span>·</span>
              <span>⚡ Results in 60 seconds</span>
              <span>·</span>
              <span>✓ No account required to try</span>
            </div>
            <div className="mt-10 w-full max-w-2xl">
              <div className="h-px w-full bg-[var(--border)]" />
              <p className="mt-3 text-[11px] italic text-[var(--dim)]">
                Vital is not a medical device. Not a replacement for professional advice. For guidance only.
              </p>
            </div>
          </div>
        </section>
      </main>
    </SmoothScroll>
  );
}

function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let lenis: any;
    let rafId: number | null = null;
    const start = async () => {
      try {
        const mod = await import("lenis");
        const Lenis = mod.default;
        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
        const raf = (time: number) => {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
      } catch (err) {
        console.warn("Lenis not available, using native scroll.");
      }
    };
    start();
    return () => {
      if (lenis) lenis.destroy();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return <>{children}</>;
}

function FloatingNav() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-[rgba(30,42,64,0.5)] bg-[rgba(6,8,16,0.7)] backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <span className="hero-title text-[20px] text-[var(--cyan)]">Vital</span>
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--green)] opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--green)]" />
          </span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <Link className="heading rounded-full border border-[var(--border)] px-4 py-2 text-[11px] text-[var(--muted)] hover:text-[var(--text)]" href="/sign-in?redirect_url=/post-auth">
            Get Started
          </Link>
        </div>
        <div className="md:hidden">
          <button className="heading rounded-full border border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted)]">
            Menu
          </button>
        </div>
      </div>
    </nav>
  );
}

function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(60% 60% at 10% 10%, #051A3A 0%, transparent 60%), radial-gradient(55% 55% at 90% 20%, #003344 0%, transparent 55%), radial-gradient(50% 50% at 50% 80%, #00193A 0%, transparent 60%)",
          filter: "blur(12px)",
          animation: "auroraShift 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function Spotlight() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 h-[60vh] w-[60vw] bg-[radial-gradient(circle_at_20%_20%,rgba(0,201,255,0.12),transparent_60%)]" />
  );
}

function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"140\" viewBox=\"0 0 140 140\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.8\" numOctaves=\"2\"/></filter><rect width=\"140\" height=\"140\" filter=\"url(%23n)\" opacity=\"0.4\"/></svg>')",
      }}
    />
  );
}

function TextGenerateEffect({ text, size }: { text: string; size?: string }) {
  const words = text.split(" ");
  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.3 } } }}
      className={`hero-title mt-6 leading-[0.95] text-[var(--text)] ${size ? "" : "text-[48px] md:text-[72px]"}`}
      style={size ? { fontSize: size } : undefined}
    >
      {words.map((word, idx) => (
        <MotionSpan
          key={`${word}-${idx}`}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
          }}
          className="mr-2 inline-block"
        >
          {word}
        </MotionSpan>
      ))}
    </MotionDiv>
  );
}

function TypewriterText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    let index = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      interval = setInterval(() => {
        index += 1;
        setDisplay(text.slice(0, index));
        if (index >= text.length && interval) clearInterval(interval);
      }, 30);
    };
    const timeout = setTimeout(start, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay]);
  return <p className={className}>{display}</p>;
}

function MovingBorderButton({ href, label, large }: { href: string; label: string; large?: boolean }) {
  return (
    <Link
      href={href}
      className={`heading relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[var(--border)] px-6 py-3 text-[12px] uppercase tracking-[0.15em] text-[var(--cyan)] transition hover:scale-[1.02] hover:bg-[rgba(0,201,255,0.15)] ${
        large ? "px-8 py-4 text-[13px]" : ""
      }`}
      style={{ background: "var(--cyan-dim)" }}
    >
      <span
        className="pointer-events-none absolute inset-0"
        style={{
          padding: "1.5px",
          background: "conic-gradient(from 0deg, #00C9FF, #7C3AED, #00C9FF)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          animation: "borderSpin 6s linear infinite",
        }}
      />
      {label}
    </Link>
  );
}

function StatsBar({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  return (
    <div className="sticky top-[60px] z-40 w-full border-y border-[var(--border)] bg-[rgba(12,17,32,0.8)] backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        {stats.map((stat, idx) => (
          <div key={stat.label} className="flex flex-1 items-center justify-center gap-3">
            <StatNumber value={stat.value} suffix={stat.suffix} color={stat.color} prefersReducedMotion={prefersReducedMotion} />
            <div className="heading text-[9px] uppercase tracking-[0.18em] text-[var(--dim)]">{stat.label}</div>
            {idx < stats.length - 1 ? (
              <div
                className="ml-4 h-8 w-px bg-[var(--border)]"
                style={{ animation: "dividerPulse 3s infinite", animationDelay: `${idx * 0.75}s` }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatNumber({
  value,
  suffix,
  color,
  prefersReducedMotion,
}: {
  value: number;
  suffix?: string;
  color: string;
  prefersReducedMotion: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setStarted(true);
      },
      { threshold: 0.6 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, prefersReducedMotion, value]);

  return (
    <div ref={ref} className="mono text-[20px]" style={{ color }}>
      {display.toFixed(1)}
      {suffix ?? ""}
    </div>
  );
}

function WobbleCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ y: -6, rotate: -0.4 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      {children}
    </MotionDiv>
  );
}

function MeteorField() {
  return (
    <div className="absolute right-4 top-4 h-12 w-20 overflow-hidden">
      <span className="absolute right-0 top-2 h-10 w-[2px] bg-[rgba(0,201,255,0.4)]" style={{ animation: "meteor 2.8s infinite" }} />
      <span className="absolute right-6 top-0 h-12 w-[2px] bg-[rgba(0,201,255,0.3)]" style={{ animation: "meteor 3.4s infinite 1s" }} />
      <span className="absolute right-12 top-3 h-8 w-[2px] bg-[rgba(0,201,255,0.2)]" style={{ animation: "meteor 4s infinite 0.6s" }} />
    </div>
  );
}


function FeatureCard({
  tag,
  title,
  body,
  flip,
}: {
  tag: string;
  title: string;
  body: string;
  flip: boolean;
}) {
  return (
    <MotionDiv
      initial={{ opacity: 0, x: flip ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -6, rotate: flip ? 0.4 : -0.4 }}
      className={`flex flex-col gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 md:flex-row ${
        flip ? "md:flex-row-reverse" : ""
      }`}
    >
      <div className="flex-1">
        <span className="heading inline-flex rounded-full border border-[rgba(0,201,255,0.2)] bg-[rgba(0,201,255,0.06)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--cyan)]">
          {tag}
        </span>
        <h3 className="heading mt-4 text-[26px] text-[var(--text)]">{title}</h3>
        <p className="mt-3 text-[15px] text-[var(--muted)]">{body}</p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        {tag === "PANIC DETECTION" ? <GaugeVisual /> : null}
        {tag === "EMERGENCY ALERTS" ? <PhoneVisual /> : null}
        {tag === "TREND TRACKING" ? <SparklineVisual /> : null}
      </div>
    </MotionDiv>
  );
}

function GaugeVisual() {
  return (
    <div className="flex items-center gap-4">
      <div className="mono rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-4 py-3 text-[18px] text-[var(--amber)]">
        8.0
        <div className="text-[9px] text-[var(--dim)]">STRESS</div>
      </div>
      <div className="mono text-[20px] text-[var(--text)]" style={{ animation: "spark 2s infinite" }}>
        ≠
      </div>
      <div className="mono rounded-2xl border border-[var(--border)] bg-[var(--elevated)] px-4 py-3 text-[18px] text-[var(--green)]">
        2.3
        <div className="text-[9px] text-[var(--dim)]">RISK</div>
      </div>
    </div>
  );
}

function PhoneVisual() {
  return (
    <div className="relative h-48 w-40 rounded-2xl border border-[var(--border)] bg-[var(--elevated)]">
      <div className="absolute left-3 top-3 h-3 w-8 rounded-full bg-[var(--border)]" />
      <MotionDiv
        initial={{ y: -20, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="absolute left-4 right-4 top-10 rounded-xl border border-[rgba(0,201,255,0.3)] bg-[rgba(0,201,255,0.08)] p-3 text-[10px] text-[var(--text)]"
      >
        VITAL: A symptom may need urgent care. Please check in.
      </MotionDiv>
    </div>
  );
}

function SparklineVisual() {
  return (
    <div className="relative h-32 w-56 rounded-2xl border border-[var(--border)] bg-[var(--elevated)] p-4">
      <div className="absolute inset-0 opacity-30">
        <Sparkles />
      </div>
      <svg viewBox="0 0 200 60" className="relative z-10 h-full w-full">
        <MotionPath
          d="M 0 40 L 30 28 L 60 35 L 90 20 L 120 30 L 150 18 L 180 24 L 200 16"
          stroke="#00C9FF"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5 }}
        />
      </svg>
    </div>
  );
}

function BackgroundBeams() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(circle_at_bottom,rgba(0,201,255,0.12),transparent_70%)]" />
      <div className="absolute inset-x-0 bottom-0 h-96 bg-[radial-gradient(circle_at_bottom,rgba(0,201,255,0.06),transparent_55%)]" />
    </div>
  );
}

function Sparkles() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full bg-[var(--cyan)] opacity-40"
          style={{
            top: `${10 + i * 10}%`,
            left: `${15 + i * 9}%`,
            animation: "spark 3s infinite",
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
