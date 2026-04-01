"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type FormData = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  activityLevel: string;
  conditions: string;
  medications: string;
  allergies: string;
  sleepHours: string;
  stressLevel: string;
  emergencyName: string;
  emergencyPhone: string;
  baselineHr: string;
  baselineBp: string;
};

export default function OnboardingPage() {
  const [form, setForm] = useState<FormData>({
    age: "",
    sex: "",
    heightCm: "",
    weightKg: "",
    activityLevel: "",
    conditions: "",
    medications: "",
    allergies: "",
    sleepHours: "",
    stressLevel: "",
    emergencyName: "",
    emergencyPhone: "",
    baselineHr: "",
    baselineBp: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<"idle" | "prompting" | "enabled" | "saving" | "error" | "loading">("idle");
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSubscriptionId, setPushSubscriptionId] = useState<string | null>(null);
  const router = useRouter();
  const { getToken } = useAuth();
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  const handleChange = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const saveEmergencyContact = async (token: string, subscriptionId?: string | null) => {
    if (!form.emergencyName.trim() || !form.emergencyPhone.trim()) {
      return;
    }
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";
    const response = await fetch(`${apiBase}/api/contacts`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.emergencyName.trim(),
        phone: form.emergencyPhone.trim(),
        relation: "family",
        ...(subscriptionId ? { pushSubscriptionId: subscriptionId } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Failed to save emergency contact");
    }
  };

  const loadOneSignal = async () => {
    if (typeof window === "undefined") return null;
    if ((window as any).OneSignal) return (window as any).OneSignal;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[src*="OneSignalSDK"]');
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load OneSignal SDK."));
      document.head.appendChild(script);
    });

    const waitForOneSignal = await new Promise<any | null>((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        const os = (window as any).OneSignal;
        if (os) {
          resolve(os);
          return;
        }
        if (Date.now() - startedAt > 8000) {
          resolve(null);
          return;
        }
        setTimeout(tick, 200);
      };
      tick();
    });

    return waitForOneSignal;
  };

  const enablePush = async () => {
    if (!oneSignalAppId) {
      setPushStatus("error");
      setPushError("NEXT_PUBLIC_ONESIGNAL_APP_ID is not configured.");
      return;
    }
    if (!form.emergencyName.trim() || !form.emergencyPhone.trim()) {
      setPushStatus("error");
      setPushError("Add an emergency contact name and phone first.");
      return;
    }

    setPushError(null);
    setPushStatus("loading");
    try {
      const OneSignal = await loadOneSignal();
      if (!OneSignal) {
        setPushStatus("error");
        setPushError("OneSignal SDK not available. Check ad blockers or site URL configuration.");
        return;
      }

      if (!OneSignal.initialized) {
        try {
          await OneSignal.init({
            appId: oneSignalAppId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
          });
        } catch (err: any) {
          const msg = err?.message ?? "";
          if (msg.includes("Can only be used on:")) {
            setPushStatus("error");
            setPushError("OneSignal is locked to a specific site URL. Update the Site URL in OneSignal Web configuration.");
            return;
          }
          throw err;
        }
      }

      setPushStatus("prompting");
      if (OneSignal?.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission();
      } else if (OneSignal?.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      } else if (OneSignal?.registerForPushNotifications) {
        await OneSignal.registerForPushNotifications();
      }

      const permission = OneSignal?.Notifications?.getPermissionStatus
        ? await OneSignal.Notifications.getPermissionStatus()
        : "denied";

      if (permission !== "granted") {
        setPushStatus("error");
        setPushError("Push permission was denied. Please enable notifications in your browser settings.");
        return;
      }

      const nextId =
        OneSignal?.User?.PushSubscription?.id ??
        (OneSignal?.getUserId ? await OneSignal.getUserId() : null);

      if (!nextId) {
        setPushStatus("error");
        setPushError("Push enabled, but no subscription ID was returned.");
        return;
      }

      const token = await getToken();
      if (!token) {
        setPushStatus("error");
        setPushError("Authentication token missing.");
        return;
      }

      setPushStatus("saving");
      await saveEmergencyContact(token, nextId);
      setPushSubscriptionId(nextId);
      setPushStatus("enabled");
    } catch (err) {
      setPushStatus("error");
      setPushError(err instanceof Error ? err.message : "Failed to enable push alerts.");
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = await getToken();
      if (!token) {
        setError("Authentication token missing.");
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

      const response = await fetch(`${apiBase}/api/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to save onboarding");
      }

      await saveEmergencyContact(token, pushSubscriptionId);

      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <header className="mb-6 rounded-2xl border border-[#1f3364] bg-[#0b1732]/90 p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[#7fc8ff]">Vital Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#f2f6ff]">First-Time User Questions</h1>
          <p className="mt-2 text-sm text-[#9bb2dc]">
            Fill this once. You can update these fields later in Profile.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <QuestionCard title="Age" helper="Years">
            <input value={form.age} onChange={(e) => handleChange("age", e.target.value)} className="input" placeholder="e.g. 24" />
          </QuestionCard>

          <QuestionCard title="Biological Sex">
            <select value={form.sex} onChange={(e) => handleChange("sex", e.target.value)} className="input">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="intersex">Intersex</option>
            </select>
          </QuestionCard>

          <QuestionCard title="Height" helper="cm">
            <input value={form.heightCm} onChange={(e) => handleChange("heightCm", e.target.value)} className="input" placeholder="e.g. 172" />
          </QuestionCard>

          <QuestionCard title="Weight" helper="kg">
            <input value={form.weightKg} onChange={(e) => handleChange("weightKg", e.target.value)} className="input" placeholder="e.g. 68" />
          </QuestionCard>

          <QuestionCard title="Activity Level">
            <select value={form.activityLevel} onChange={(e) => handleChange("activityLevel", e.target.value)} className="input">
              <option value="">Select</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly Active</option>
              <option value="moderate">Moderately Active</option>
              <option value="high">Highly Active</option>
            </select>
          </QuestionCard>

          <QuestionCard title="Average Sleep" helper="hours/night">
            <input value={form.sleepHours} onChange={(e) => handleChange("sleepHours", e.target.value)} className="input" placeholder="e.g. 8" />
          </QuestionCard>

          <QuestionCard title="Baseline Stress" helper="1-10">
            <input value={form.stressLevel} onChange={(e) => handleChange("stressLevel", e.target.value)} className="input" placeholder="e.g. 5" />
          </QuestionCard>

          <QuestionCard title="Baseline Heart Rate" helper="bpm">
            <input value={form.baselineHr} onChange={(e) => handleChange("baselineHr", e.target.value)} className="input" placeholder="e.g. 72" />
          </QuestionCard>
        </section>

        <section className="mt-4 space-y-4">
          <QuestionCard title="Known Medical Conditions">
            <textarea value={form.conditions} onChange={(e) => handleChange("conditions", e.target.value)} className="input min-h-24" placeholder="e.g. Asthma, Hypertension" />
          </QuestionCard>

          <QuestionCard title="Current Medications">
            <textarea value={form.medications} onChange={(e) => handleChange("medications", e.target.value)} className="input min-h-24" placeholder="e.g. Metformin 500mg daily" />
          </QuestionCard>

          <QuestionCard title="Allergies">
            <textarea value={form.allergies} onChange={(e) => handleChange("allergies", e.target.value)} className="input min-h-24" placeholder="e.g. Penicillin, peanuts" />
          </QuestionCard>
        </section>

        <section className="mt-4 grid gap-4 sm:grid-cols-2">
          <QuestionCard title="Emergency Contact Name">
            <input value={form.emergencyName} onChange={(e) => handleChange("emergencyName", e.target.value)} className="input" placeholder="e.g. John Doe" />
          </QuestionCard>

          <QuestionCard title="Emergency Contact Phone">
            <input value={form.emergencyPhone} onChange={(e) => handleChange("emergencyPhone", e.target.value)} className="input" placeholder="e.g. +1 555 123 4567" />
          </QuestionCard>

          <QuestionCard title="Baseline Blood Pressure">
            <input value={form.baselineBp} onChange={(e) => handleChange("baselineBp", e.target.value)} className="input" placeholder="e.g. 120/80" />
          </QuestionCard>
        </section>

        <section className="mt-4">
          <div className="rounded-2xl border border-[#23437a] bg-[#0f1d3a] p-4">
            <p className="text-sm font-medium text-[#e6efff]">Emergency Push Alerts</p>
            <p className="mt-2 text-sm text-[#9bb2dc]">
              Enable push alerts on this device to notify your emergency contact.
              The device must accept browser notifications for alerts to work.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={enablePush}
                disabled={pushStatus === "prompting" || pushStatus === "saving" || pushStatus === "loading"}
                className="rounded-xl border border-[#2f5ea8] bg-[#112850] px-4 py-2 text-sm font-semibold text-[#9fd8ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pushStatus === "loading"
                  ? "Initializing..."
                  : pushStatus === "prompting"
                    ? "Requesting permission..."
                    : pushStatus === "saving"
                      ? "Saving..."
                      : pushStatus === "enabled"
                        ? "Push enabled"
                        : "Enable push alerts"}
              </button>
              {pushSubscriptionId ? (
                <span className="text-xs text-[#7fc8ff]">Subscription linked</span>
              ) : null}
            </div>
            {pushError ? (
              <p className="mt-2 text-xs text-[#ff6c79]">{pushError}</p>
            ) : null}
          </div>
        </section>

        {error ? <p className="mt-4 text-sm text-[#ff6c79]">{error}</p> : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={saving}
            className="rounded-xl bg-[#1fb5ff] px-6 py-3 text-sm font-semibold text-[#032347] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </button>
          <Link
            href="/home"
            className="rounded-xl border border-[#2f5ea8] bg-[#112850] px-6 py-3 text-sm font-semibold text-[#9fd8ff]"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </main>
  );
}

function QuestionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#23437a] bg-[#0f1d3a] p-4">
      <p className="text-sm font-medium text-[#e6efff]">
        {title} {helper ? <span className="text-xs text-[#8ba1cb]">({helper})</span> : null}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}
