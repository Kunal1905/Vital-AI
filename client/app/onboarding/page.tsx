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
  const [pushStatus, setPushStatus] = useState<"idle" | "prompting" | "enabled" | "saving" | "error" | "loading">("loading");
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSubscriptionId, setPushSubscriptionId] = useState<string | null>(null);
  const [pushSaved, setPushSaved] = useState(false);
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

  useEffect(() => {
    if (!oneSignalAppId || typeof window === "undefined") return;

    const initializeOneSignal = async () => {
      setPushStatus("loading");
      try {
        console.log('🔵 Starting OneSignal initialization...');
        
        // Check network accessibility first
        try {
          console.log('🌐 Testing CDN connectivity...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js', {
            method: 'HEAD',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            console.log('✅ CDN is accessible (status:', response.status + ')');
          } else {
            console.warn('⚠️ CDN returned:', response.status, response.statusText);
          }
        } catch (fetchErr) {
          console.error('❌ Cannot reach OneSignal CDN:', (fetchErr as Error).message);
          console.error('👉 This is likely a network/firewall/ad-blocker issue');
          setPushStatus("error");
          setPushError("OneSignal is blocked by a network rule or ad blocker. Please allow cdn.onesignal.com and refresh.");
          return;
        }
        
        // Manually inject the script with better error tracking
        const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
        if (!existingScript) {
          console.log('📥 Injecting OneSignal SDK script...');
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.async = true;
          script.type = 'text/javascript';
          
          // Track script loading errors
          script.onerror = (err) => {
            console.error('❌ Script onerror event fired:', err);
            console.error('Check Network tab - the script request probably failed');
          };
          script.onload = () => {
            console.log('✅ Script onload event fired');
            // Give it a moment to execute
            setTimeout(() => {
              console.log('After onload - window.OneSignal exists:', !!(window as any).OneSignal);
            }, 100);
          };
          
          document.head.appendChild(script);
          console.log('📝 Script injected, waiting for it to execute...');
        } else {
          console.log('✅ OneSignal script already exists in DOM');
          console.log('Current script src:', existingScript.getAttribute('src'));
        }

        // Set up OneSignal deferred queue
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        // Wait for OneSignal to be available
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.error('❌ OneSignal SDK timeout after 15 seconds');
            console.error('🔍 Debug info:');
            console.error('- Script in DOM:', !!document.querySelector('script[src*="OneSignalSDK"]'));
            console.error('- window.OneSignal:', typeof (window as any).OneSignal);
            
            // Additional debug
            const script = document.querySelector('script[src*="OneSignalSDK"]');
            if (script) {
              console.error('- Script element:', script);
              console.error('- Script src:', script.getAttribute('src'));
            }
            
            console.error('- Check Network tab for failed requests to cdn.onesignal.com');
            console.error('- Check Console for any red errors about blocked/failed scripts');
            setPushStatus("error");
            setPushError("OneSignal SDK didn't load. It looks blocked by a browser extension or network policy.");
            resolve();
          }, 15000);

          // Check if OneSignal is available
          const checkOneSignal = () => {
            const win = window as any;
            if (win.OneSignal && typeof win.OneSignal.init === 'function') {
              clearTimeout(timeout);
              console.log('✅ OneSignal SDK loaded successfully');
              resolve();
            } else {
              setTimeout(checkOneSignal, 200);
            }
          };
          checkOneSignal();
        });

        if (!(window as any).OneSignal) {
          return;
        }

        const OneSignal = (window as any).OneSignal;
        console.log('OneSignal object exists:', !!OneSignal);
        
        // Check if already initialized
        if (!OneSignal.initialized) {
          console.log('Initializing OneSignal with appId:', oneSignalAppId);
          try {
            await OneSignal.init({
              appId: oneSignalAppId,
              allowLocalhostAsSecureOrigin: true,
              notifyButton: {
                enable: false, // We're using our own button
              },
            });
          } catch (initErr: any) {
            const msg = initErr?.message || "";
            if (msg.includes("Can only be used on:")) {
              setPushStatus("error");
              setPushError(
                "OneSignal is locked to a specific site URL. Add localhost to the OneSignal Web config or test on your deployed URL."
              );
              return;
            }
            throw initErr;
          }
          console.log('✓ OneSignal initialized successfully');
        } else {
          console.log('OneSignal already initialized');
        }

        const getOptInStatus = async () => {
          if (OneSignal?.User?.PushSubscription?.getOptInStatus) {
            return OneSignal.User.PushSubscription.getOptInStatus();
          }
          if (OneSignal?.Notifications?.getPermissionStatus) {
            const status = await OneSignal.Notifications.getPermissionStatus();
            return status === "granted";
          }
          if (OneSignal?.isPushNotificationsEnabled) {
            return OneSignal.isPushNotificationsEnabled();
          }
          return false;
        };

        const getSubscriptionId = async () => {
          const directId = OneSignal?.User?.PushSubscription?.id;
          if (directId) return directId;
          if (OneSignal?.getUserId) {
            return OneSignal.getUserId();
          }
          return null;
        };

        // Get current subscription status
        const isPushEnabled = await getOptInStatus();
        console.log('Push opt-in status:', isPushEnabled);

        const currentId = await getSubscriptionId();
        console.log('Current push ID:', currentId);
        
        if (currentId) {
          setPushSubscriptionId(currentId);
          setPushStatus("enabled");
        }

        // Listen for subscription changes
        if (OneSignal?.User?.PushSubscription?.addEventListener) {
          OneSignal.User.PushSubscription.addEventListener("change", (event: any) => {
            console.log('Push subscription changed:', event);
            const nextId = event?.current?.id;
            if (nextId) {
              setPushSubscriptionId(nextId);
            }
          });
        }
        
        // Mark as ready
        setPushStatus("idle");
      } catch (err) {
        console.error('OneSignal initialization error:', err);
        setPushStatus("error");
        setPushError(err instanceof Error ? err.message : "Failed to initialize push notifications");
      }
    };

    initializeOneSignal();
  }, [oneSignalAppId]);

  useEffect(() => {
    if (!pushSubscriptionId || pushSaved || pushStatus === "saving") return;

    const persistPushId = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        setPushStatus("saving");
        await saveEmergencyContact(token, pushSubscriptionId);
        setPushSaved(true);
        setPushStatus("enabled");
      } catch (err) {
        setPushStatus("error");
        setPushError(err instanceof Error ? err.message : "Failed to save push subscription");
      }
    };

    void persistPushId();
  }, [pushSubscriptionId, pushSaved, pushStatus, getToken]);

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
    setPushStatus("prompting");
    
    try {
      const win = window as any;
      
      // Wait for OneSignal to be available if not already
      if (!win.OneSignal || !win.OneSignal.User) {
        console.log('OneSignal not ready, waiting...');
        setPushStatus("error");
        setPushError("OneSignal is loading. Please wait a moment and try again.");
        return;
      }

      const OneSignal = win.OneSignal;
      
      // Check current permission status
      const currentOptIn = OneSignal?.User?.PushSubscription?.getOptInStatus
        ? await OneSignal.User.PushSubscription.getOptInStatus()
        : OneSignal?.Notifications?.getPermissionStatus
          ? (await OneSignal.Notifications.getPermissionStatus()) === "granted"
          : OneSignal?.isPushNotificationsEnabled
            ? await OneSignal.isPushNotificationsEnabled()
            : false;
      console.log('Current opt-in before prompt:', currentOptIn);

      // Request permission
      if (OneSignal?.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
      } else if (OneSignal?.Notifications?.requestPermission) {
        await OneSignal.Notifications.requestPermission();
      } else if (OneSignal?.registerForPushNotifications) {
        await OneSignal.registerForPushNotifications();
      } else {
        throw new Error("OneSignal push API not available.");
      }
      
      // Get the new subscription status
      const newOptIn = OneSignal?.User?.PushSubscription?.getOptInStatus
        ? await OneSignal.User.PushSubscription.getOptInStatus()
        : OneSignal?.Notifications?.getPermissionStatus
          ? (await OneSignal.Notifications.getPermissionStatus()) === "granted"
          : OneSignal?.isPushNotificationsEnabled
            ? await OneSignal.isPushNotificationsEnabled()
            : false;
      console.log('New opt-in after prompt:', newOptIn);
      
      const nextId = OneSignal?.User?.PushSubscription?.id ?? (OneSignal?.getUserId ? await OneSignal.getUserId() : null);
      console.log('Push subscription ID:', nextId);
      
      if (nextId && newOptIn) {
        setPushSubscriptionId(nextId);
        setPushStatus("enabled");
      } else if (!newOptIn) {
        setPushStatus("error");
        setPushError("Push notification permission was denied. Please enable notifications in your browser settings.");
      } else {
        setPushStatus("error");
        setPushError("Push enabled, but no subscription id was returned. Try refreshing the page.");
      }
    } catch (err) {
      console.error('Push enable error:', err);
      setPushStatus("error");
      setPushError(err instanceof Error ? err.message : "Push permission was not granted.");
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
