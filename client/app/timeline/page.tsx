"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessions } from "../(components)/useSessions";

type TimelineView = "trend" | "heatmap" | "symptoms";

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

function formatTickDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTickTime(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function TimelinePage() {
  const [selectedView, setSelectedView] = useState<TimelineView>("trend");
  const { rows, error } = useSessions({ limit: 90, refreshIntervalMs: 60000 });
  const [showStress, setShowStress] = useState(true);
  const [showSeverity, setShowSeverity] = useState(false);

  const sessions = useMemo(
    () =>
      rows.map((r) => ({
        id: String(r.id),
        score: r.riskScore ?? r.finalRiskScore ?? 0,
        stressScore: r.stressScore ?? null,
        severity: r.severity ?? null,
        riskLevel: r.riskLevel ?? r.finalRiskLevel ?? "low",
        timeAgo: toRelativeTime(r.createdAt),
        duration: `${Math.round((r.durationMinutes / 60) * 10) / 10}h`,
        createdAt: r.createdAt,
      })),
    [rows],
  );

  const avgScore = sessions.length
    ? sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length
    : 0;
  const peak = sessions.length ? Math.max(...sessions.map((s) => s.score)) : 0;
  const erAlerts = sessions.filter((s) => s.riskLevel === "high" || s.riskLevel === "emergency").length;

  const heatmapCells = useMemo(() => {
    const rowsCount = 7;
    const cols = 12;
    const total = rowsCount * cols;
    const cells = Array.from({ length: total }, () => 0);
    sessions.forEach((session, index) => {
      const slot = total - 1 - index * 2;
      if (slot >= 0) cells[slot] = Math.max(cells[slot], session.score);
    });
    return { cols, cells };
  }, [sessions]);

  const distribution = useMemo(() => {
    const levels = { low: 0, moderate: 0, high: 0, emergency: 0 };
    sessions.forEach((s) => {
      if (s.riskLevel in levels) levels[s.riskLevel as keyof typeof levels] += 1;
    });
    return [
      { name: "Low", count: levels.low, color: "#24a96f" },
      { name: "Moderate", count: levels.moderate, color: "#23a9e9" },
      { name: "High", count: levels.high, color: "#d76a3b" },
      { name: "Emergency", count: levels.emergency, color: "#e0515b" },
    ];
  }, [sessions]);

  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6">
        <section className="space-y-5">
          <header className="flex items-center gap-3">
            <span className="text-2xl text-[#8ba1cb]">←</span>
            <h2 className="text-5xl font-semibold text-[#f2f6ff]">Health Timeline</h2>
          </header>

          {error ? <div className="rounded-xl border border-[#8e3b4e] bg-[#2a1620] p-3 text-sm text-[#ffc3cf]">{error}</div> : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricTile title="avg score" value={avgScore.toFixed(1)} />
            <MetricTile title="peak" value={peak.toFixed(1)} />
            <MetricTile title="er alerts" value={String(erAlerts)} />
          </div>

          <div className={cardBase("grid grid-cols-3 p-1")}>
            <button
              onClick={() => setSelectedView("trend")}
              className={`rounded-xl py-3 text-sm font-medium ${selectedView === "trend" ? "bg-[#1fb5ff] text-[#032347]" : "text-[#8aa3d8]"}`}
            >
              ↗ Trend
            </button>
            <button
              onClick={() => setSelectedView("heatmap")}
              className={`rounded-xl py-3 text-sm font-medium ${selectedView === "heatmap" ? "bg-[#1fb5ff] text-[#032347]" : "text-[#8aa3d8]"}`}
            >
              ⌗ Heatmap
            </button>
            <button
              onClick={() => setSelectedView("symptoms")}
              className={`rounded-xl py-3 text-sm font-medium ${selectedView === "symptoms" ? "bg-[#1fb5ff] text-[#032347]" : "text-[#8aa3d8]"}`}
            >
              ≣ Symptoms
            </button>
          </div>

          {selectedView === "trend" && (
            <div className={cardBase("p-5")}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#8aa3d8]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#22b7ff]" />
                    Risk score
                  </span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showStress}
                      onChange={(e) => setShowStress(e.target.checked)}
                      className="accent-[#6ad8c9]"
                    />
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#6ad8c9]" />
                      Stress
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showSeverity}
                      onChange={(e) => setShowSeverity(e.target.checked)}
                      className="accent-[#f4be3d]"
                    />
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#f4be3d]" />
                      Severity
                    </span>
                  </label>
                </div>
                <button
                  onClick={() => setRefreshNonce((prev) => prev + 1)}
                  className="rounded-full border border-[#2c4679] px-3 py-1 text-xs text-[#b8c9ee] transition hover:border-[#4c6fb0] hover:bg-[#122245]"
                >
                  Refresh
                </button>
              </div>
              <TrendChart
                sessions={sessions}
                showStress={showStress}
                showSeverity={showSeverity}
              />
            </div>
          )}

          {selectedView === "heatmap" && (
            <div className={cardBase("p-5")}>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm text-[#8aa3d8]">Last 90 sessions</h4>
                <div className="flex items-center gap-2 text-xs text-[#8aa3d8]">
                  <span>Low</span>
                  <span className="h-3 w-3 rounded-full bg-[#24a96f]" />
                  <span className="h-3 w-3 rounded-full bg-[#d3a03b]" />
                  <span className="h-3 w-3 rounded-full bg-[#d76a3b]" />
                  <span className="h-3 w-3 rounded-full bg-[#e0515b]" />
                  <span>High</span>
                </div>
              </div>
              <div className="h-[140px] rounded-xl border border-[#1e3768] bg-[#0f1d3a] p-4">
                <div className="grid h-full max-w-[180px] gap-1" style={{ gridTemplateColumns: `repeat(${heatmapCells.cols}, minmax(0, 1fr))` }}>
                  {heatmapCells.cells.map((score, idx) => {
                    let color = "#172748";
                    if (score > 0 && score < 3) color = "#24a96f";
                    else if (score >= 3 && score < 6) color = "#d3a03b";
                    else if (score >= 6 && score < 8) color = "#d76a3b";
                    else if (score >= 8) color = "#e0515b";
                    return <div key={idx} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: color }} />;
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedView === "symptoms" && (
            <div className={cardBase("p-5")}>
              <h4 className="mb-4 text-sm text-[#8aa3d8]">Risk level distribution</h4>
              <div className="space-y-2">
                {distribution.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-sm text-[#d6e3ff]">
                      <span>{item.name}</span>
                      <span className="text-xs text-[#8aa3d8]">{item.count}x</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#223a68]">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${Math.max(8, distribution[0]?.count ? (item.count / Math.max(...distribution.map((d) => d.count), 1)) * 100 : 8)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-3xl font-semibold text-[#edf3ff]">Sessions ({sessions.length})</h3>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className={cardBase("p-4 text-sm text-[#8aa3d8]")}>No sessions yet.</div>
            ) : (
              sessions.map((session) => <SessionRow key={`${session.id}-${session.timeAgo}`} session={session} />)
            )}
          </div>
        </section>
      </div>

      <BottomNav active="timeline" />
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
    riskLevel: string;
  };
}) {
  const state = session.riskLevel === "high" || session.riskLevel === "emergency"
    ? "critical"
    : session.riskLevel === "moderate"
      ? "warning"
      : "safe";
  const styles = {
    critical: "border-l-[#ff4553] text-[#ff525d]",
    warning: "border-l-[#f4be3d] text-[#f4be3d]",
    safe: "border-l-[#1dd57e] text-[#1dd57e]",
  }[state];

  return (
    <article className={`${cardBase("border-l-4 p-4")} ${styles}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">
            {session.score.toFixed(1)} <span className="ml-2 text-[#8198c9]">{session.timeAgo}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#26589a] bg-[#133566] px-3 py-1 text-xs text-[#2dbbff]">
              {session.riskLevel}
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

function TrendChart({
  sessions,
  showStress,
  showSeverity,
}: {
  sessions: Array<{
    id: string;
    score: number;
    stressScore: number | null;
    severity: number | null;
    createdAt: string;
  }>;
  showStress: boolean;
  showSeverity: boolean;
}) {
  if (!sessions.length) {
    return (
      <div className="relative h-64 rounded-xl border border-[#243c6f]">
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-[#8aa3d8]">
          No session trend data yet.
        </p>
      </div>
    );
  }

  const points = [...sessions]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((session) => ({
      x: new Date(session.createdAt).getTime(),
      labelDate: formatTickDate(session.createdAt),
      labelTime: formatTickTime(session.createdAt),
      risk: Math.max(0, Math.min(10, session.score)),
      stress: session.stressScore !== null ? Math.max(0, Math.min(10, session.stressScore)) : null,
      severity: session.severity !== null ? Math.max(0, Math.min(10, session.severity)) : null,
    }));

  const width = 640;
  const height = 240;
  const padding = { top: 16, right: 18, bottom: 36, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minX = points[0].x;
  const maxX = points[points.length - 1].x;
  const xSpan = Math.max(1, maxX - minX);
  const yMax = 10;
  const yMin = 0;

  const toX = (x: number) => padding.left + ((x - minX) / xSpan) * chartWidth;
  const toY = (value: number) => padding.top + (1 - (value - yMin) / (yMax - yMin)) * chartHeight;

  const buildPath = (series: Array<{ x: number; y: number }>) => {
    return series
      .map((point, index) => `${index === 0 ? "M" : "L"} ${toX(point.x)} ${toY(point.y)}`)
      .join(" ");
  };

  const riskSeries = points.map((p) => ({ x: p.x, y: p.risk }));
  const stressSeries = points.filter((p) => p.stress !== null).map((p) => ({ x: p.x, y: p.stress ?? 0 }));
  const severitySeries = points.filter((p) => p.severity !== null).map((p) => ({ x: p.x, y: p.severity ?? 0 }));

  const xTicks = [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];
  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="relative h-64 rounded-xl border border-[#243c6f] bg-[#0c1933]">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
        <defs>
          <linearGradient id="riskFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22b7ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#22b7ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="#27427a"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
            <text x={8} y={toY(tick) + 4} fontSize="10" fill="#7f96c8">
              {tick}
            </text>
          </g>
        ))}

        <path
          d={`${buildPath(riskSeries)} L ${toX(points[points.length - 1].x)} ${toY(0)} L ${toX(points[0].x)} ${toY(0)} Z`}
          fill="url(#riskFill)"
        />
        <path d={buildPath(riskSeries)} fill="none" stroke="#22b7ff" strokeWidth="2.5" />

        {showStress && stressSeries.length > 1 && (
          <path d={buildPath(stressSeries)} fill="none" stroke="#6ad8c9" strokeWidth="2" />
        )}
        {showSeverity && severitySeries.length > 1 && (
          <path d={buildPath(severitySeries)} fill="none" stroke="#f4be3d" strokeWidth="2" />
        )}

        {riskSeries.map((point) => (
          <circle
            key={`risk-${point.x}`}
            cx={toX(point.x)}
            cy={toY(point.y)}
            r="3.5"
            fill="#0c1933"
            stroke="#22b7ff"
            strokeWidth="2"
          />
        ))}

        {xTicks.map((tick) => (
          <g key={tick.x}>
            <text
              x={toX(tick.x)}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#7f96c8"
            >
              {tick.labelDate}
            </text>
            <text
              x={toX(tick.x)}
              y={height - 2}
              textAnchor="middle"
              fontSize="9"
              fill="#5e76a8"
            >
              {tick.labelTime}
            </text>
          </g>
        ))}
      </svg>
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
    <Link href={href} className="flex flex-col items-center justify-center gap-1">
      <span className={`text-xl ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{icon}</span>
      <span className={`text-xs ${active ? "text-[#1bb5ff]" : "text-[#90a7d8]"}`}>{label}</span>
    </Link>
  );
}
