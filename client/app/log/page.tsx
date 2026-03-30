"use client";

import { SignedIn, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Step = 0 | 1 | 2;
type Category = string;

type Vitals = {
  heartRate: string;
  temperatureF: string;
  bloodPressureSystolic: string;
  bloodPressureDiastolic: string;
  spo2: string;
};

type SymptomItem = {
  key: string;
  name: string;
};

type SymptomGroup = {
  title: string;
  items: SymptomItem[];
};

type ApiSymptomRow = { id: number; name: string };

type SessionAnalyzeResponse = {
  sessionId: number;
  triage: {
    score: number;
    level: string;
    confidence: number;
    recommendation: string;
    redFlagsDetected: string[];
    contributingFactors: Record<string, number>;
  };
  panic: {
    activated: boolean;
    score: number;
    emergencyProbability: number;
  };
  exercises: string[];
  familyAlertTriggered: boolean;
  nlpDetected: Array<{ symptomId: string; confidence: number }>;
};

const fallbackSymptomGroupsRaw = [
  {
    title: "Heart & Chest",
    items: [
      "Chest pain (crushing/pressure)",
      "Pain radiating to arm/jaw/back",
      "Chest pain (sharp/stabbing)",
      "Chest tightness",
      "Palpitations",
    ],
  },
  {
    title: "Breathing",
    items: [
      "Shortness of breath at rest",
      "Shortness of breath on exertion",
      "Throat swelling / allergic reaction",
    ],
  },
  {
    title: "Head & Nerves",
    items: ["Thunderclap headache (worst ever)", "Vision changes", "Dizziness"],
  },
  {
    title: "Stomach & Gut",
    items: ["Nausea", "Vomiting", "Abdominal pain", "Diarrhea", "Loss of appetite"],
  },
  {
    title: "Muscle & Bones",
    items: ["Muscle ache", "Joint pain", "Back pain", "Neck stiffness", "Body weakness"],
  },
  {
    title: "General",
    items: ["Fever", "Fatigue", "Chills", "Sweating", "Unexplained weight loss"],
  },
];

const fallbackSymptomGroups: SymptomGroup[] = fallbackSymptomGroupsRaw.map((group) => ({
  title: group.title,
  items: group.items.map((name) => ({
    key: `fallback:${group.title}:${name}`,
    name,
  })),
}));

const standardVitals = {
  heartRate: 72,
  temperatureF: 98.6,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  spo2: 98,
};

export default function LogPage() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

  const [step, setStep] = useState<Step>(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [freeTextInput, setFreeTextInput] = useState("");
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState(30);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7);
  const [moodIndex, setMoodIndex] = useState(2);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [vitals, setVitals] = useState<Vitals>({
    heartRate: "",
    temperatureF: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    spo2: "",
  });
  const [resolvedVitals, setResolvedVitals] = useState<typeof standardVitals | null>(null);
  const symptomGroups = fallbackSymptomGroups;

  const toggleSymptom = (symptomKey: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomKey)
        ? prev.filter((item) => item !== symptomKey)
        : [...prev, symptomKey],
    );
  };

  const symptomMap = useMemo(() => {
    const map = new Map<string, SymptomItem>();
    symptomGroups.forEach((group) => {
      group.items.forEach((item) => {
        map.set(item.key, item);
      });
    });
    return map;
  }, [symptomGroups]);

  const categories: Category[] = useMemo(
    () => ["All", ...symptomGroups.map((group) => group.title)],
    [symptomGroups],
  );

  const filteredGroups = symptomGroups
    .filter((group) => selectedCategory === "All" || group.title === selectedCategory)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const resolveVitals = () => {
    const parsed = {
      heartRate: Number(vitals.heartRate),
      temperatureF: Number(vitals.temperatureF),
      bloodPressureSystolic: Number(vitals.bloodPressureSystolic),
      bloodPressureDiastolic: Number(vitals.bloodPressureDiastolic),
      spo2: Number(vitals.spo2),
    };

    const finalVitals = {
      heartRate:
        Number.isFinite(parsed.heartRate) && parsed.heartRate > 0
          ? parsed.heartRate
          : standardVitals.heartRate,
      temperatureF:
        Number.isFinite(parsed.temperatureF) && parsed.temperatureF > 0
          ? parsed.temperatureF
          : standardVitals.temperatureF,
      bloodPressureSystolic:
        Number.isFinite(parsed.bloodPressureSystolic) && parsed.bloodPressureSystolic > 0
          ? parsed.bloodPressureSystolic
          : standardVitals.bloodPressureSystolic,
      bloodPressureDiastolic:
        Number.isFinite(parsed.bloodPressureDiastolic) && parsed.bloodPressureDiastolic > 0
          ? parsed.bloodPressureDiastolic
          : standardVitals.bloodPressureDiastolic,
      spo2: Number.isFinite(parsed.spo2) && parsed.spo2 > 0 ? parsed.spo2 : standardVitals.spo2,
    };

    setResolvedVitals(finalVitals);
    return finalVitals;
  };

  const formatSleep = (hours: number) => {
    const whole = Math.floor(hours);
    const mins = hours % 1 === 0.5 ? 30 : 0;
    return `${whole}${mins ? ".5" : ""}h (${whole}h ${mins}m)`;
  };

  const submitSession = async () => {
    setErrorText(null);

    if (selectedSymptoms.length === 0 && !freeTextInput.trim()) {
      setErrorText("Select at least one symptom or enter free text before continuing.");
      return;
    }

    if (!authLoaded || !isSignedIn) {
      setErrorText("Please sign in first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Missing auth token. Please sign in again.");
      }

      const finalVitals = resolveVitals();
      const moodScore = moodIndex + 1;
      const selectedSymptomItems = selectedSymptoms
        .map((key) => symptomMap.get(key))
        .filter((item): item is SymptomItem => Boolean(item))
        .map((item) => item.name);

      let selectedDbSymptomIds: number[] = [];
      if (selectedSymptomItems.length > 0) {
        try {
          const symptomLookupResponse = await fetch(`${apiBase}/api/symptoms?isActive=true`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          const symptomLookupPayload = await symptomLookupResponse.json().catch(() => ({}));
          if (symptomLookupResponse.ok) {
            const rows = (symptomLookupPayload?.data ?? []) as ApiSymptomRow[];
            const idByName = new Map<string, number>();
            rows.forEach((row) => {
              idByName.set(row.name.trim().toLowerCase(), row.id);
            });
            selectedDbSymptomIds = selectedSymptomItems
              .map((name) => idByName.get(name.trim().toLowerCase()))
              .filter((id): id is number => typeof id === "number");
          }
        } catch {
          // Continue with free text fallback if lookup fails.
        }
      }

      const mergedFreeText = [freeTextInput.trim(), ...selectedSymptomItems]
        .filter(Boolean)
        .join(". ");

      const response = await fetch(`${apiBase}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          symptomIds: selectedDbSymptomIds,
          freeTextInput: mergedFreeText || undefined,
          severity,
          durationMinutes: duration,
          stressScore: stress,
          sleepHours: sleep,
          heartRate: finalVitals.heartRate,
          temperatureF: finalVitals.temperatureF,
          bloodPressureSystolic: finalVitals.bloodPressureSystolic,
          bloodPressureDiastolic: finalVitals.bloodPressureDiastolic,
          spo2: finalVitals.spo2,
          moodScore,
          offlineSession: false,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (payload?.code === "ONBOARDING_REQUIRED") {
          router.push("/onboarding");
          return;
        }
        throw new Error(payload?.error || "Failed to log session.");
      }

      const result = payload as SessionAnalyzeResponse;
      router.push(`/results?sessionId=${result.sessionId}`);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Failed to log session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020b22] text-[#d6e3ff]">
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-10 sm:px-6">
        <section className="space-y-6">
          <div className="grid grid-cols-4 gap-2 pt-4">
            {[0, 1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={`h-1 rounded-full ${bar <= step ? "bg-[#1cb4ff]" : "bg-[#2b406f]"}`}
              />
            ))}
          </div>

          <p className="text-sm text-[#8aa3d8]">{["Symptoms", "Severity", "Vitals (Optional)"][step]}</p>

          {step === 0 && (
            <>
              <h2 className="text-5xl font-semibold text-[#f2f6ff]">What are you feeling?</h2>
              <p className="text-xl text-[#8ba1cb]">Select all symptoms that apply</p>

              <input
                className="h-14 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg text-[#cad7f2] outline-none placeholder:text-[#7d92bc]"
                placeholder="Search symptoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                {categories.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedCategory(tag)}
                    className={`rounded-full px-4 py-2 text-sm ${
                      selectedCategory === tag
                        ? "bg-[#18b1ff] text-[#032347]"
                        : "bg-[#1a2c55] text-[#8aa3d8]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-1">
                {filteredGroups.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 text-sm uppercase tracking-[0.16em] text-[#8aa3d8]">{group.title}</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.items.map((item) => {
                        const active = selectedSymptoms.includes(item.key);
                        return (
                          <button
                            key={item.key}
                            onClick={() => toggleSymptom(item.key)}
                            className={`rounded-xl border px-4 py-3 text-left text-lg ${
                              active
                                ? "border-[#17b3ff] bg-[#124377] text-[#dff3ff]"
                                : "border-[#2d4478] bg-[#1a2b52] text-[#cfdbf2]"
                            }`}
                          >
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredGroups.length === 0 && (
                  <p className="rounded-xl border border-[#2d4478] bg-[#1a2b52] p-4 text-[#8ba1cb]">
                    No symptoms found for this category/search.
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.16em] text-[#8aa3d8]">Additional details</p>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 py-3 text-base text-[#cad7f2] outline-none placeholder:text-[#7d92bc]"
                  placeholder="Describe anything else you are feeling..."
                  value={freeTextInput}
                  onChange={(e) => setFreeTextInput(e.target.value)}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-5xl font-semibold text-[#f2f6ff]">How severe is it?</h2>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-2xl text-[#8ba1cb]">Severity</p>
                    <p className="text-4xl font-semibold text-[#f8b432]">{severity}/10</p>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full accent-[#1fb5ff]"
                  />
                </div>

                <div>
                  <p className="mb-2 text-2xl text-[#8ba1cb]">How long have you had this? ({duration} minutes)</p>
                  <input
                    type="range"
                    min={5}
                    max={180}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full accent-[#1fb5ff]"
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-2xl text-[#8ba1cb]">Stress today: {stress}/10</p>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={stress}
                      onChange={(e) => setStress(Number(e.target.value))}
                      className="w-full accent-[#1fb5ff]"
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-2xl text-[#8ba1cb]">
                      Sleep last night: {formatSleep(sleep)}
                    </p>
                    <input
                      type="range"
                      min={3}
                      max={12}
                      step={0.5}
                      value={sleep}
                      onChange={(e) => setSleep(Number(e.target.value))}
                      className="w-full accent-[#1fb5ff]"
                    />
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-2xl text-[#8ba1cb]">How are you feeling overall?</p>
                  <div className="flex gap-4 text-4xl">
                    {["🤯", "🙁", "😐", "🙂", "😊"].map((emoji, index) => (
                      <button
                        key={emoji}
                        onClick={() => setMoodIndex(index)}
                        className={`rounded-xl px-3 py-2 ${
                          moodIndex === index ? "border border-[#22b8ff] bg-[#164368]" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-5xl font-semibold text-[#f2f6ff]">Optional: Vitals</h2>
              <p className="text-xl text-[#8ba1cb]">Adding vitals significantly improves accuracy</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input
                  className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg"
                  placeholder={`Heart Rate (BPM) - Std: ${standardVitals.heartRate}`}
                  value={vitals.heartRate}
                  onChange={(e) => setVitals((prev) => ({ ...prev, heartRate: e.target.value }))}
                />
                <input
                  className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg"
                  placeholder={`Temperature (°F) - Std: ${standardVitals.temperatureF}`}
                  value={vitals.temperatureF}
                  onChange={(e) => setVitals((prev) => ({ ...prev, temperatureF: e.target.value }))}
                />
                <input
                  className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg"
                  placeholder={`Blood Pressure (sys) - Std: ${standardVitals.bloodPressureSystolic}`}
                  value={vitals.bloodPressureSystolic}
                  onChange={(e) =>
                    setVitals((prev) => ({ ...prev, bloodPressureSystolic: e.target.value }))
                  }
                />
                <input
                  className="h-14 rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg"
                  placeholder={`Blood Pressure (dia) - Std: ${standardVitals.bloodPressureDiastolic}`}
                  value={vitals.bloodPressureDiastolic}
                  onChange={(e) =>
                    setVitals((prev) => ({ ...prev, bloodPressureDiastolic: e.target.value }))
                  }
                />
              </div>
              <input
                className="h-14 w-full rounded-xl border border-[#2a4379] bg-[#1a2950] px-4 text-lg"
                placeholder={`SpO2 (%) - Std: ${standardVitals.spo2}`}
                value={vitals.spo2}
                onChange={(e) => setVitals((prev) => ({ ...prev, spo2: e.target.value }))}
              />
              <p className="text-sm text-[#8ba1cb]">
                If you skip vitals, standard values will be used automatically.
              </p>
              {resolvedVitals && (
                <div className="rounded-xl border border-[#2f5ea8] bg-[#112d57] p-4 text-sm text-[#cde3ff]">
                  Using vitals: HR {resolvedVitals.heartRate} bpm, Temp {resolvedVitals.temperatureF}°F, BP{" "}
                  {resolvedVitals.bloodPressureSystolic}/{resolvedVitals.bloodPressureDiastolic}, SpO2{" "}
                  {resolvedVitals.spo2}%.
                </div>
              )}
            </>
          )}

          {errorText && (
            <div className="rounded-xl border border-[#8e3b4e] bg-[#2a1620] p-3 text-sm text-[#ffc3cf]">
              {errorText}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setErrorText(null);
                if (step === 0) {
                  router.push("/home");
                  return;
                }
                setStep((prev) => (prev === 0 ? 0 : ((prev - 1) as Step)));
              }}
              className="text-xl text-[#8ba1cb]"
            >
              ← {step === 0 ? "Cancel" : "Back"}
            </button>
            <button
              onClick={() => {
                setErrorText(null);
                if (step < 2) {
                  if (step === 0 && selectedSymptoms.length === 0 && !freeTextInput.trim()) {
                    setErrorText("Select at least one symptom or enter free text before continuing.");
                    return;
                  }
                  setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
                  return;
                }
                void submitSession();
              }}
              disabled={isSubmitting}
              className="rounded-xl bg-[#1fb5ff] px-8 py-3 text-lg font-semibold text-[#032347] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {step === 2 ? (isSubmitting ? "Saving..." : "Analyze Symptoms →") : "Continue →"}
            </button>
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
        <NavButton
          label="Timeline"
          icon="◷"
          href="/timeline"
          active={active === "timeline"}
        />
        <NavButton
          label="Profile"
          icon="◌"
          href="/profile"
          active={active === "profile"}
        />
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
