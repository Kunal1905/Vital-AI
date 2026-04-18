"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo } from "react";
import { useSessions } from "../(components)/useSessions";

function cardBase(extra = "") {
  return `rounded-2xl border border-[#233f75] bg-[#0f1d3a] ${extra}`;
}

function toRelativeTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.floor(ms / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function toState(level: string): "critical" | "warning" | "safe" {
  if (level === "high" || level === "emergency") return "critical";
  if (level === "moderate") return "warning";
  return "safe";
}

export default function HomePage() {
  const { rows, loading, error } = useSessions({ limit: 20 });

  const latest = rows[0];
  const latestScore = latest ? latest.riskScore ?? latest.finalRiskScore ?? 0 : 0;
  const latestLevel = latest ? (latest.riskLevel ?? latest.finalRiskLevel ?? "low") : "low";
  const avgScore = rows.length
    ? rows.reduce((sum, s) => sum + (s.riskScore ?? s.finalRiskScore ?? 0), 0) / rows.length
    : 0;
  const avgStress = rows.length
    ? rows.reduce((sum, s) => sum + (s.stressScore ?? 0), 0) / rows.length
    : 0;
  const avgSleep = rows.filter((s) => s.sleepHours !== null).length
    ? rows.reduce((sum, s) => sum + (s.sleepHours ?? 0), 0) /
      rows.filter((s) => s.sleepHours !== null).length
    : 0;

  const recentSessions = useMemo(
    () =>
      rows.slice(0, 5).map((s) => ({
        id: String(s.id),
        score: s.riskScore ?? s.finalRiskScore ?? 0,
        timeAgo: toRelativeTime(s.createdAt),
        duration: `${Math.round((s.durationMinutes / 60) * 10) / 10}h`,
        label: `Severity ${s.severity}`,
        state: toState(s.riskLevel ?? s.finalRiskLevel ?? "low"),
      })),
    [rows],
  );

  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div
        className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-6"
        style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
      >
        <section className="space-y-5">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-[#f2f6ff]">Vital</h1>
              <p className="mt-1 text-sm text-[#8aa3d8]">Your health risk overview</p>
            </div>
            <div className="rounded-full border border-[#2f4f8c] bg-[#12254b] px-4 py-2 text-lg font-semibold text-[#8da7da]">
              {rows.length}
            </div>
          </header>

          {error ? (
            <div className="rounded-xl border border-[#8e3b4e] bg-[#2a1620] p-3 text-sm text-[#ffc3cf]">{error}</div>
          ) : null}

          <div className={cardBase("p-7 text-center")}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#809bcf]">Latest risk score</p>
            {loading && rows.length === 0 ? (
              <div className="mt-6 space-y-4">
                <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-[#16284d]" />
                <div className="mx-auto h-10 w-28 animate-pulse rounded-lg bg-[#16284d]" />
                <div className="mx-auto h-8 w-24 animate-pulse rounded-full bg-[#16284d]" />
              </div>
            ) : (
              <>
                <div className="mx-auto mt-4 h-36 w-60 rounded-t-full border-x-8 border-t-8 border-[#ff3c48]" />
                <p className="-mt-20 text-7xl font-semibold text-[#ff3c48]">{latestScore.toFixed(1)}</p>
                <p className="mt-2 text-sm text-[#7f97c6]">/10</p>
                <button className="mt-3 rounded-full border border-[#8d2f3a] bg-[#3b0e16] px-4 py-1 text-sm font-semibold text-[#ff4e5a]">
                  {latestLevel}
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link href="/log" className="rounded-2xl bg-gradient-to-r from-[#1bb5fa] to-[#1a91e0] p-5 text-left">
              <p className="text-2xl text-white">+</p>
              <p className="mt-2 text-3xl font-semibold text-white">Log Symptoms</p>
              <p className="text-sm text-[#d2ebff]">Under 60 seconds</p>
            </Link>
            <Link href="/timeline" className="rounded-2xl bg-gradient-to-r from-[#5f6ff8] to-[#6862f7] p-5 text-left">
              <p className="text-2xl text-white">↗</p>
              <p className="mt-2 text-3xl font-semibold text-white">Health Trends</p>
              <p className="text-sm text-[#d5ddff]">View patterns</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile title="7-day avg" value={avgScore.toFixed(1)} />
            <MetricTile title="avg stress" value={avgStress.toFixed(1)} />
            <MetricTile title="avg sleep" value={`${avgSleep.toFixed(1)}h`} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-[#edf3ff] sm:text-3xl">Recent Sessions</h3>
              <Link href="/timeline" className="text-sm text-[#22b7ff]">View all →</Link>
            </div>
            {loading && rows.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={cardBase("h-20 animate-pulse bg-[#122347] p-4")} />
                ))}
              </div>
            ) : recentSessions.length === 0 ? (
              <div className={cardBase("p-4 text-sm text-[#8aa3d8]")}>No sessions yet. Start from Log.</div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session) => <SessionRow key={session.id} session={session} />)}
              </div>
            )}
          </div>
        </section>
      </div>

      <BottomNav active="home" />
    </div>
  );
}

function SessionRow({
  session,
}: {
  session: {
    id: string;
    score: number;
    timeAgo: string;
    duration: string;
    label: string;
    state: "critical" | "warning" | "safe";
  };
}) {
  const styles = {
    critical: "border-l-[#ff4553] text-[#ff525d]",
    warning: "border-l-[#f4be3d] text-[#f4be3d]",
    safe: "border-l-[#1dd57e] text-[#1dd57e]",
  }[session.state];

  return (
    <article className={`${cardBase("border-l-4 p-4")} ${styles}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            {session.score.toFixed(1)} <span className="ml-2 text-[#8198c9]">{session.timeAgo}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#26589a] bg-[#133566] px-3 py-1 text-xs text-[#2dbbff]">
              {session.label}
            </span>
          </div>
        </div>
        <p className="text-sm text-[#7f96c8]">◷ {session.duration}</p>
      </div>
    </article>
  );
}

function MetricTile({ title, value }: { title: string; value: string }) {
  return (
    <div className={cardBase("p-5 text-center")}>
      <p className="text-4xl font-semibold text-[#e7efff]">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[#7f97c8]">{title}</p>
    </div>
  );
}

function BottomNav({ active }: { active: "home" | "log" | "timeline" | "profile" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-[#1f3364] bg-[#0b1732]/95 backdrop-blur">
      <div className="mx-auto grid h-[5.5rem] w-full max-w-3xl grid-cols-5 pb-safe">
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
        <UserButton appearance={{ elements: { avatarBox: "h-7 w-7 border border-[#2f5ea8]" } }} />
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
    <Link href={href} className="flex flex-col items-center justify-center gap-0.5 px-1">
      <span className={`text-lg sm:text-xl ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{icon}</span>
      <span className={`text-[10px] sm:text-xs ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"} text-center leading-tight`}>{label}</span>
    </Link>
  );
}
