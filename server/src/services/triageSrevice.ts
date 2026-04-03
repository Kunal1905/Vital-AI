
import { symptoms } from "../models";

interface TriageInput {
  symptomIds: string[];
  severity: number;
  durationMinutes: number;
  stressScore: number;
  sleepHours: number;
  heartRate?: number;
  // From user_onboarding
  age: number;
  hasHypertension: boolean;
  hasDiabetes: boolean;
  hasHeartDisease: boolean;
  hasAsthma: boolean;
  emergencySensitivity: number;
  panicFilterThreshold: number;
  anxietyTendency: string;
  panicAttackHistory: boolean;
}

interface TriageResult {
  acuteRiskScore: number;
  triageLevel: 'low' | 'moderate' | 'high' | 'emergency';
  confidencePct: number;
  redFlagsDetected: string[];
  contributingFactors: Record<string, number>;
  recommendation: string;
  panicScore: number;
  panicFilterActivated: boolean;
  emergencyProbability: number;
}

// In-memory cache of symptom weights (load once from DB on startup)
// This avoids a DB query on every symptom submission
let weightsCache: Map<string, {weight: number; isRedFlag: boolean}> | null = null;

export async function loadSymptomWeights(db: any) {
  if (weightsCache) return;
  const rows = await db
    .select({
      id: symptoms.id,
      baseWeight: symptoms.baseWeight,
      isRedFlag: symptoms.isRedFlag,
      isActive: symptoms.isActive,
    })
    .from(symptoms);

  const activeRows = rows.filter((row: any) => row.isActive !== false);
  weightsCache = new Map(activeRows.map((s: any) => [
    s.id.toString(),
    { weight: s.baseWeight || 1, isRedFlag: s.isRedFlag || false }
  ]));
}

export function setWeightsForTesting(map: Map<string, { weight: number; isRedFlag: boolean }>): void {
  weightsCache = map;
}

export function computeTriage(input: TriageInput): TriageResult {
  if (!weightsCache) throw new Error('Symptom weights not loaded');
  const factors: Record<string, number> = {};

  // ─ Red flag check ─
  const redFlags = input.symptomIds.filter(id => weightsCache!.get(id)?.isRedFlag);
  if (redFlags.length > 0) {
    return {
      acuteRiskScore: 9.9, triageLevel: 'emergency', confidencePct: 99,
      redFlagsDetected: redFlags, contributingFactors: { red_flag: 1 },
      recommendation: 'Call 911 now. Do not drive yourself.',
      panicScore: 0, panicFilterActivated: false, emergencyProbability: 0.99,
    };
  }

  // ─ Severity factor ─
  const sevFactor = input.severity <= 3 ? 0.5 : input.severity <= 6 ? 1.0 : input.severity <= 8 ? 1.5 : 2.0;
  factors.severity = sevFactor;

  // ─ Duration factor ─
  const durFactor = input.durationMinutes < 15 ? 0.8 : input.durationMinutes < 60 ? 1.0
    : input.durationMinutes < 360 ? 1.2 : input.durationMinutes < 1440 ? 1.5 : 1.8;
  factors.duration = durFactor;

  // ─ Age multiplier ─
  const ageMult = input.age < 30 ? 0.85 : input.age < 45 ? 1.0 : input.age < 60 ? 1.15 : input.age < 75 ? 1.3 : 1.5;
  factors.age = ageMult;

  // ─ Chronic condition multiplier ─
  let chronicMult = 1.0;
  if (input.hasHeartDisease) { chronicMult += 0.25; factors.heart_disease = 0.25; }
  if (input.hasHypertension) { chronicMult += 0.15; factors.hypertension = 0.15; }
  if (input.hasDiabetes)     { chronicMult += 0.15; factors.diabetes = 0.15; }
  if (input.hasAsthma)       { chronicMult += 0.10; factors.asthma = 0.10; }
  chronicMult = Math.min(chronicMult, 1.6);

  // ─ Heart rate boost ─
  let hrBoost = 0;
  if (input.heartRate && input.heartRate > 130) hrBoost = 1.5;
  else if (input.heartRate && input.heartRate > 100) hrBoost = 0.5;

  // ─ Base score ─
  let base = 0;
  for (const id of input.symptomIds) {
    const w = weightsCache!.get(id)?.weight || 1;
    base += w * sevFactor * durFactor;
  }
  const rawScore = (base * ageMult * chronicMult * (0.8 + input.emergencySensitivity * 0.5)) + hrBoost;
  const acuteRiskScore = Math.min(Math.round(rawScore * 10) / 10, 10.0);
  const triageLevel = acuteRiskScore < 4 ? 'low' : acuteRiskScore < 7 ? 'moderate' : acuteRiskScore < 9 ? 'high' : 'emergency';

  // ─ Panic detection ─
  const hour = new Date().getHours();
  let panicScore = 0;
  if (hour >= 23 || hour <= 4) panicScore += 1;
  if (input.stressScore >= 8) panicScore += 1;
  if (input.stressScore >= 7 && acuteRiskScore <= 3.5) panicScore += 2;
  if (input.anxietyTendency === 'high' && acuteRiskScore < 5) panicScore += 1;
  if (input.panicAttackHistory && input.symptomIds.some(s => ['chest_tightness','sob_rest'].includes(s))) panicScore += 2;
  
  const panicFilterActivated = panicScore >= 2;
  const emergencyProbability = (acuteRiskScore / 10) * (1 - Math.min(0.4, panicScore * 0.08));
  const confidence = Math.min(Math.max(70 + (input.heartRate ? 10 : 0) + (input.symptomIds.length > 2 ? 5 : 0) - (panicFilterActivated ? 10 : 0), 40), 95);

  const recommendations: Record<string, string> = {
    low: 'Monitor at home. Return if symptoms worsen.',
    moderate: 'Seek medical care today within 4–8 hours.',
    high: 'Go to urgent care or ER today. Do not delay.',
    emergency: 'Call 911 immediately. Do not drive yourself.',
  };

  return { acuteRiskScore, triageLevel, confidencePct: confidence, redFlagsDetected: [],
    contributingFactors: factors, recommendation: recommendations[triageLevel],
    panicScore, panicFilterActivated, emergencyProbability };
}
