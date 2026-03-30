"use client";

import { SignedIn, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function cardBase(extra = "") {
  return `rounded-2xl border border-[#233f75] bg-[#0f1d3a] ${extra}`;
}

type Onboarding = {
  age: number;
  sex: string;
  activityLevel: string;
  conditions: string;
  medications: string;
  allergies: string;
  sleepHours: number;
  stressLevel: number;
  baselineHr: number;
  baselineBp: string;
  hasHypertension: boolean;
  hasDiabetes: boolean;
  hasHeartDisease: boolean;
  hasAsthma: boolean;
  hasThyroidDisorder: boolean;
};

const defaultProfile: Onboarding = {
  age: 20,
  sex: "unspecified",
  activityLevel: "moderate",
  conditions: "",
  medications: "",
  allergies: "",
  sleepHours: 8,
  stressLevel: 5,
  baselineHr: 72,
  baselineBp: "120/80",
  hasHypertension: false,
  hasDiabetes: false,
  hasHeartDisease: false,
  hasAsthma: false,
  hasThyroidDisorder: false,
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [form, setForm] = useState<Onboarding>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isLoaded || !isSignedIn) return;
      setError(null);
      setLoading(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Missing auth token.");
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
        const response = await fetch(`${apiBase}/api/onboarding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Failed to load profile");
        setForm({ ...defaultProfile, ...(payload?.onboarding ?? {}) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isLoaded, isSignedIn, getToken]);

  const riskVector = useMemo(() => {
    const cardio = form.hasHeartDisease ? 35 : form.hasHypertension ? 22 : 12;
    const respiratory = form.hasAsthma ? 24 : 10;
    const metabolic = form.hasDiabetes || form.hasThyroidDisorder ? 20 : 12;
    const stress = Math.min(40, Math.max(5, form.stressLevel * 4));
    const musculoskeletal = 10;
    const neurological = 10;
    return [
      ["Cardiovascular", cardio, "#ff4f59"],
      ["Respiratory", respiratory, "#18b5ff"],
      ["Metabolic", metabolic, "#f8b432"],
      ["Stress", stress, "#6f79ff"],
      ["Musculoskeletal", musculoskeletal, "#17d67d"],
      ["Neurological", neurological, "#ff61bf"],
    ] as const;
  }, [form]);

  const save = async () => {
    if (!isLoaded || !isSignedIn) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing auth token.");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
      const response = await fetch(`${apiBase}/api/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Failed to save profile");
      setMessage("Profile saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6">
        <section className="space-y-5">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl text-[#8ba1cb]">←</span>
              <h2 className="text-5xl font-semibold text-[#f2f6ff]">Profile</h2>
            </div>
            <button onClick={save} disabled={saving || loading} className="rounded-xl bg-[#1fb5ff] px-6 py-3 text-lg font-semibold text-[#032347] disabled:opacity-60">
              {saving ? "Saving..." : "Save"}
            </button>
          </header>

          {error ? <div className="rounded-xl border border-[#8e3b4e] bg-[#2a1620] p-3 text-sm text-[#ffc3cf]">{error}</div> : null}
          {message ? <div className="rounded-xl border border-[#2f5ea8] bg-[#112d57] p-3 text-sm text-[#cde3ff]">{message}</div> : null}

          <div className={cardBase("p-5")}>
            <h3 className="text-3xl font-semibold text-[#edf3ff]">Baseline Risk Vector</h3>
            <div className="mt-4 space-y-3">
              {riskVector.map(([name, value, color]) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between text-sm text-[#8aa3d8]">
                    <span>{name}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#2a3f6f]">
                    <div className="h-2 rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={cardBase("space-y-4 p-5")}>
            <h3 className="text-3xl font-semibold text-[#edf3ff]">Basic Information</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg" value={form.age} onChange={(e) => setForm((p) => ({ ...p, age: Number(e.target.value) || 0 }))} />
              <select className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg" value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="unspecified">Unspecified</option>
              </select>
            </div>
            <select className="h-14 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg" value={form.activityLevel} onChange={(e) => setForm((p) => ({ ...p, activityLevel: e.target.value }))}>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
            <div>
              <p className="mb-2 text-lg text-[#8ba1cb]">Average Sleep: {form.sleepHours.toFixed(1)}h</p>
              <input type="range" min={3} max={12} step={0.5} value={form.sleepHours} onChange={(e) => setForm((p) => ({ ...p, sleepHours: Number(e.target.value) }))} className="w-full accent-[#1fb5ff]" />
            </div>
            <div>
              <p className="mb-2 text-lg text-[#8ba1cb]">Baseline Stress: {form.stressLevel}/10</p>
              <input type="range" min={1} max={10} value={form.stressLevel} onChange={(e) => setForm((p) => ({ ...p, stressLevel: Number(e.target.value) }))} className="w-full accent-[#1fb5ff]" />
            </div>
          </div>

          <div className={cardBase("space-y-3 p-5")}>
            <h3 className="text-3xl font-semibold text-[#edf3ff]">Medical Conditions</h3>
            {[
              ["Hypertension", "hasHypertension"],
              ["Diabetes", "hasDiabetes"],
              ["Heart Disease", "hasHeartDisease"],
              ["Asthma", "hasAsthma"],
              ["Thyroid Disorder", "hasThyroidDisorder"],
            ].map(([label, key]) => (
              <label key={key} className="flex items-center justify-between rounded-xl bg-[#1a2c55] px-4 py-3">
                <span className="text-xl text-[#d6e3ff]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(form[key as keyof Onboarding])}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.checked } as Onboarding))}
                  className="h-5 w-5 accent-[#1fb5ff]"
                />
              </label>
            ))}
          </div>

          <div className={cardBase("space-y-4 p-5")}>
            <h3 className="text-3xl font-semibold text-[#edf3ff]">Notes</h3>
            <textarea className="min-h-20 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 py-3 text-lg" value={form.conditions} onChange={(e) => setForm((p) => ({ ...p, conditions: e.target.value }))} placeholder="Conditions" />
            <textarea className="min-h-20 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 py-3 text-lg" value={form.medications} onChange={(e) => setForm((p) => ({ ...p, medications: e.target.value }))} placeholder="Medications" />
            <textarea className="min-h-20 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 py-3 text-lg" value={form.allergies} onChange={(e) => setForm((p) => ({ ...p, allergies: e.target.value }))} placeholder="Allergies" />
          </div>
        </section>
      </div>

      <BottomNav active="profile" />
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
