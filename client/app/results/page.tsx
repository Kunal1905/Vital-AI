"use client";

import { SignedIn, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SessionPayload = {
  session: {
    id: number;
    finalRiskScore: number | null;
    finalRiskLevel: string | null;
    createdAt: string;
  };
};

type BreathingPayload = {
  exerciseId: string;
  symptomSlugs: string[];
};

type SoundType = "rain" | "ocean" | "forest" | "instrumental";

const EMERGENCY_THRESHOLD = 8;

const breathingExercises: Array<{
  id: string;
  title: string;
  pattern: string;
  steps: string[];
  sound: SoundType;
}> = [
  {
    id: "box",
    title: "Box Breathing",
    pattern: "4-4-4-4",
    sound: "rain",
    steps: [
      "Inhale through the nose for 4 seconds.",
      "Hold the breath for 4 seconds.",
      "Exhale slowly for 4 seconds.",
      "Hold the breath out for 4 seconds.",
      "Repeat for 4 to 6 cycles.",
    ],
  },
  {
    id: "478",
    title: "4-7-8 Breathing",
    pattern: "4-7-8",
    sound: "ocean",
    steps: [
      "Inhale quietly through the nose for 4 seconds.",
      "Hold the breath for 7 seconds.",
      "Exhale through the mouth for 8 seconds.",
      "Pause briefly and repeat 4 cycles.",
    ],
  },
  {
    id: "belly",
    title: "Deep Belly Breathing",
    pattern: "6-2-6",
    sound: "forest",
    steps: [
      "Place a hand on your abdomen and one on your chest.",
      "Inhale for 6 seconds, letting your belly rise.",
      "Hold the breath gently for 2 seconds.",
      "Exhale for 6 seconds, feeling the belly fall.",
      "Repeat slowly for 3 to 5 minutes.",
    ],
  },
  {
    id: "coherent",
    title: "Coherent Breathing",
    pattern: "5-5",
    sound: "instrumental",
    steps: [
      "Inhale through the nose for 5 seconds.",
      "Exhale through the nose for 5 seconds.",
      "Maintain a smooth, even pace.",
      "Continue for 5 minutes or longer.",
    ],
  },
];

const soundLabels: Record<SoundType, string> = {
  rain: "Rain sounds",
  ocean: "Ocean waves",
  forest: "Forest ambiance",
  instrumental: "Soft instrumental",
};

function useMeditationAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const ensureContext = () => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.gain.value = 0.4;
      gainRef.current.connect(ctxRef.current.destination);
    }
    return ctxRef.current;
  };

  const stop = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setIsPlaying(false);
  };

  const play = async (sound: SoundType, volume: number) => {
    stop();
    const ctx = ensureContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (!gainRef.current) return;
    gainRef.current.gain.cancelScheduledValues(ctx.currentTime);
    gainRef.current.gain.setValueAtTime(0, ctx.currentTime);
    gainRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
    cleanupRef.current = buildSoundGraph(ctx, gainRef.current, sound);
    setIsPlaying(true);
  };

  const setVolume = (volume: number) => {
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.2);
    }
  };

  useEffect(() => {
    return () => {
      stop();
      if (ctxRef.current) {
        void ctxRef.current.close();
      }
    };
  }, []);

  return { isPlaying, play, stop, setVolume };
}

function buildSoundGraph(ctx: AudioContext, output: GainNode, sound: SoundType) {
  const nodes: AudioNode[] = [];
  const stoppers: Array<() => void> = [];

  const createBrownNoiseSource = () => {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const connectChain = (source: AudioNode, filters: AudioNode[], gainValue: number) => {
    let current: AudioNode = source;
    filters.forEach((filter) => {
      current.connect(filter);
      current = filter;
    });
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    current.connect(gain);
    gain.connect(output);
    nodes.push(gain, ...filters);
  };

  if (sound === "rain") {
    const noise = createBrownNoiseSource();
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 2200;
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 250;
    connectChain(noise, [high, low], 0.15);
    noise.start();
    stoppers.push(() => noise.stop());
    nodes.push(noise);
  }

  if (sound === "ocean") {
    const noise = createBrownNoiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const swell = ctx.createGain();
    swell.gain.value = 0.12;
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    noise.connect(filter);
    filter.connect(swell);
    swell.connect(output);
    lfo.connect(lfoGain);
    lfoGain.connect(swell.gain);
    noise.start();
    lfo.start();
    stoppers.push(() => noise.stop(), () => lfo.stop());
    nodes.push(noise, filter, swell, lfo, lfoGain);
  }

  if (sound === "forest") {
    const noise = createBrownNoiseSource();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 0.6;
    connectChain(noise, [filter], 0.1);
    noise.start();
    stoppers.push(() => noise.stop());
    nodes.push(noise);

    const bird = ctx.createOscillator();
    bird.type = "sine";
    bird.frequency.value = 740;
    const birdGain = ctx.createGain();
    birdGain.gain.value = 0.015;
    const birdLfo = ctx.createOscillator();
    birdLfo.type = "sine";
    birdLfo.frequency.value = 0.14;
    const birdLfoGain = ctx.createGain();
    birdLfoGain.gain.value = 0.012;
    bird.connect(birdGain);
    birdGain.connect(output);
    birdLfo.connect(birdLfoGain);
    birdLfoGain.connect(birdGain.gain);
    bird.start();
    birdLfo.start();
    stoppers.push(() => bird.stop(), () => birdLfo.stop());
    nodes.push(bird, birdGain, birdLfo, birdLfoGain);
  }

  if (sound === "instrumental") {
    const base = ctx.createOscillator();
    base.type = "sine";
    base.frequency.value = 196;
    base.detune.value = -4;
    const harmony = ctx.createOscillator();
    harmony.type = "sine";
    harmony.frequency.value = 294;
    harmony.detune.value = 2;
    const upper = ctx.createOscillator();
    upper.type = "sine";
    upper.frequency.value = 392;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.08;
    base.connect(padGain);
    harmony.connect(padGain);
    upper.connect(padGain);
    padGain.connect(output);
    base.start();
    harmony.start();
    upper.start();
    stoppers.push(() => base.stop(), () => harmony.stop(), () => upper.stop());
    nodes.push(base, harmony, upper, padGain);
  }

  return () => {
    stoppers.forEach((stopper) => stopper());
    nodes.forEach((node) => node.disconnect());
  };
}

function getScoreTone(score: number) {
  if (score < 3) {
    return { label: "Good", color: "#4ce3a2", border: "#1f5f4a" };
  }
  if (score < 6) {
    return { label: "Moderate", color: "#f3c05c", border: "#7a5c24" };
  }
  if (score < EMERGENCY_THRESHOLD) {
    return { label: "Elevated", color: "#f29a5f", border: "#7a4a24" };
  }
  return { label: "High", color: "#ff5f5f", border: "#8a2b2b" };
}

export default function ResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

  const [score, setScore] = useState<number | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [activeExerciseId, setActiveExerciseId] = useState("");
  const [isExerciseLoading, setIsExerciseLoading] = useState(false);
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.45);
  const audio = useMeditationAudio();

  const activeExercise = useMemo(
    () => breathingExercises.find((exercise) => exercise.id === activeExerciseId),
    [activeExerciseId],
  );

  useEffect(() => {
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) {
      setErrorText("Missing session id. Please complete an assessment first.");
      setIsLoading(false);
      return;
    }

    if (!authLoaded) return;
    if (!isSignedIn) {
      setErrorText("Please sign in to view your results.");
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setErrorText(null);
      try {
        const token = await getToken();
        if (!token) throw new Error("Missing auth token. Please sign in again.");
        const response = await fetch(`${apiBase}/api/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = (await response.json().catch(() => ({}))) as SessionPayload;
        if (!response.ok) {
          throw new Error((payload as any)?.error || "Failed to load session.");
        }
        const finalScore = payload.session?.finalRiskScore ?? 0;
        setScore(finalScore);
        setLevel(payload.session?.finalRiskLevel ?? null);

        if (finalScore < EMERGENCY_THRESHOLD) {
          setIsExerciseLoading(true);
          setExerciseError(null);
          try {
            const breathingResponse = await fetch(`${apiBase}/api/sessions/${sessionId}/breathing`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const breathingPayload = (await breathingResponse.json().catch(() => ({}))) as BreathingPayload;
            if (!breathingResponse.ok) {
              throw new Error((breathingPayload as any)?.error || "Failed to load breathing exercise.");
            }
            const match = breathingExercises.find((exercise) => exercise.id === breathingPayload.exerciseId);
            setActiveExerciseId(match ? match.id : breathingExercises[0]?.id ?? "");
          } catch (exerciseError) {
            setExerciseError(
              exerciseError instanceof Error ? exerciseError.message : "Failed to load breathing exercise.",
            );
            setActiveExerciseId(breathingExercises[0]?.id ?? "");
          } finally {
            setIsExerciseLoading(false);
          }
        }
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : "Failed to load results.");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [apiBase, authLoaded, getToken, isSignedIn, searchParams]);

  const handleToggleSound = async () => {
    if (!activeExercise) return;
    if (audio.isPlaying) {
      audio.stop();
      return;
    }
    await audio.play(activeExercise.sound, volume);
  };

  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6">
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#7f96c8]">Score Summary</p>
              <h1 className="mt-3 text-4xl font-semibold text-[#f2f6ff]">Your Results</h1>
            </div>
            <button
              onClick={() => router.push("/log")}
              className="rounded-full border border-[#2c4679] px-4 py-2 text-sm text-[#b8c9ee] transition hover:border-[#4c6fb0] hover:bg-[#122245]"
            >
              New Assessment
            </button>
          </div>

          {isLoading && (
            <div className="space-y-4">
              <div className="h-36 animate-pulse rounded-3xl border border-[#223764] bg-[#0b1733]" />
              <div className="h-40 animate-pulse rounded-3xl border border-[#223764] bg-[#0b1733]" />
            </div>
          )}

          {errorText && (
            <div className="rounded-2xl border border-[#8e3b4e] bg-[#2a1620] p-4 text-sm text-[#ffc3cf]">
              {errorText}
            </div>
          )}

          {!isLoading && score !== null && (
            <>
              <div
                className="rounded-3xl border bg-gradient-to-br from-[#0d1b3a] via-[#0b1733] to-[#0a142b] p-6 shadow-[0_18px_40px_rgba(4,11,26,0.6)]"
                style={{
                  borderColor: getScoreTone(score).border,
                  boxShadow: `0 18px 45px ${getScoreTone(score).border}40`,
                }}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-[#8aa3d8]">Overall Score</p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <div className="flex items-end gap-3">
                      <span className="text-6xl font-semibold" style={{ color: getScoreTone(score).color }}>
                        {score.toFixed(1)}
                      </span>
                      <span className="text-lg text-[#7e95c5]">/10</span>
                    </div>
                    <p className="mt-3 text-sm text-[#9fb4dc]">
                      {getScoreTone(score).label} range {level ? `• ${level}` : ""}.
                    </p>
                  </div>
                  <span
                    className="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                    style={{
                      borderColor: getScoreTone(score).border,
                      color: getScoreTone(score).color,
                      background: "rgba(8, 16, 34, 0.6)",
                    }}
                  >
                    {getScoreTone(score).label}
                  </span>
                </div>
              </div>

              {score >= EMERGENCY_THRESHOLD ? (
                <div className="rounded-3xl border border-[#ff3b3b] bg-gradient-to-br from-[#2b0a0a] via-[#1c0606] to-[#110303] p-6 shadow-[0_20px_60px_rgba(255,60,60,0.25)]">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full border border-[#ff4c4c] bg-[#3a0b0b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb3b3]">
                      High Alert
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-[#ffd1d1]">
                        Emergency support recommended
                      </h2>
                      <p className="mt-2 text-sm text-[#f7bcbc]">
                        Your score indicates significant risk. If you feel unsafe or at risk of harm,
                        seek urgent help now.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <a
                      href="tel:102"
                      className="rounded-xl border border-[#ff5a5a] bg-[#4a0f0f] px-4 py-3 text-center text-sm font-semibold text-[#ffe0e0] transition hover:bg-[#5a1414]"
                    >
                      Call 102 (Ambulance)
                    </a>
                    <a
                      href="tel:108"
                      className="rounded-xl border border-[#ff5a5a] bg-[#4a0f0f] px-4 py-3 text-center text-sm font-semibold text-[#ffe0e0] transition hover:bg-[#5a1414]"
                    >
                      Call 108 (Emergency)
                    </a>
                  </div>
                  <div className="mt-4 rounded-xl border border-dashed border-[#ff7a7a] px-4 py-3 text-sm text-[#f7bcbc]">
                    Local crisis helpline: Add number
                  </div>
                  <div className="mt-3 rounded-xl border border-dashed border-[#ff7a7a] px-4 py-3 text-sm text-[#f7bcbc]">
                    Local hospital: Add number
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-[#223764] bg-[#0b162f] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold text-[#e3edff]">Guided breathing</h2>
                      <p className="mt-2 text-sm text-[#8aa3d8]">
                        Based on your symptoms, we selected a breathing exercise for you.
                      </p>
                    </div>
                    <div className="rounded-full border border-[#2c4679] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#9fb4dc]">
                      Below {EMERGENCY_THRESHOLD}/10
                    </div>
                  </div>

                  {isExerciseLoading && (
                    <div className="mt-6 h-40 animate-pulse rounded-2xl border border-[#223764] bg-[#0d1a35]" />
                  )}

                  {exerciseError && (
                    <div className="mt-6 rounded-2xl border border-[#8e3b4e] bg-[#2a1620] p-4 text-sm text-[#ffc3cf]">
                      {exerciseError}
                    </div>
                  )}

                  {!isExerciseLoading && activeExercise && (
                    <div className="mt-6 rounded-2xl border border-[#4c6fb0] bg-[#122245] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-[#e2ecff]">{activeExercise.title}</p>
                          <p className="mt-1 text-sm text-[#9fb4dc]">
                            Pattern: {activeExercise.pattern} • {soundLabels[activeExercise.sound]}
                          </p>
                        </div>
                        <span className="rounded-full border border-[#2c4679] px-3 py-1 text-xs text-[#9fb4dc]">
                          Recommended
                        </span>
                      </div>
                      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[#c1d2f2]">
                        {activeExercise.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {activeExercise && (
                    <div className="mt-6 rounded-2xl border border-[#223764] bg-[#0d1a35] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[#e2ecff]">Meditation sound</p>
                          <p className="mt-1 text-sm text-[#8aa3d8]">
                            {soundLabels[activeExercise.sound]} • Looping ambience
                          </p>
                        </div>
                        <button
                          onClick={handleToggleSound}
                          className="rounded-full border border-[#2c4679] px-5 py-2 text-sm font-semibold text-[#d9e6ff] transition hover:border-[#4c6fb0] hover:bg-[#122245]"
                        >
                          {audio.isPlaying ? "Pause" : "Play"}
                        </button>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-xs uppercase tracking-[0.2em] text-[#7f96c8]">Volume</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={volume}
                          onChange={(event) => {
                            const next = Number(event.target.value);
                            setVolume(next);
                            audio.setVolume(next);
                          }}
                          className="w-full accent-[#7fc8ff]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            <Link href="/home" className="text-sm text-[#8aa3d8] hover:text-[#c6d7ff]">
              ← Back to dashboard
            </Link>
          </div>
        </section>
      </div>

      <BottomNav active="log" />
    </div>
  );
}

function BottomNav({ active }: { active: "home" | "log" | "timeline" | "profile" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-[#1f3364] bg-[#0b1732]/95 backdrop-blur">
      <div className="mx-auto grid h-20 w-full max-w-3xl grid-cols-5">
        <NavButton label="Home" icon="⌂" href="/home" active={active === "home"} />
        <NavButton label="Log" icon="⊕" href="/log" active={active === "log"} />
        <NavButton label="Timeline" icon="◷" href="/timeline" active={active === "timeline"} />
        <NavButton label="Profile" icon="◌" href="/profile" active={active === "profile"} />
        <UserAvatarNavItem />
      </div>
    </nav>
  );
}

function UserAvatarNavItem() {
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-7 w-7 border border-[#2f5ea8]",
            },
          }}
        />
      </SignedIn>
      <span className="text-xs text-[#90a7d8]">Account</span>
    </div>
  );
}

function NavButton({
  label,
  icon,
  href,
  active,
}: {
  label: string;
  icon: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1">
      <span className={`text-xl ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{icon}</span>
      <span className={`text-xs ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{label}</span>
    </Link>
  );
}
