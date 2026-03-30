export interface NLPMatch {
  symptomId: string
  confidence: number  // 0.0 – 1.0
}

export interface NLPResult {
  confirmed: NLPMatch[]   // confidence >= 0.85 — auto-added to symptom list
  uncertain: NLPMatch[]   // confidence 0.70–0.84 — shown to user as "Did you mean?"
}

// Each keyword maps to an array of possible symptom matches.
// A single word can match multiple symptoms (e.g. "pain" matches
// both chest pain and arm/jaw pain — context determines which,
// but we return both and let severity + other words sort it out).
const KEYWORD_MAP: Record<string, NLPMatch[]> = {
  // ── Cardiac ──
  chest:       [{ symptomId: 'chest_tightness',      confidence: 0.82 },
                { symptomId: 'chest_pain_sharp',      confidence: 0.75 }],
  tight:       [{ symptomId: 'chest_tightness',       confidence: 0.88 }],
  tightness:   [{ symptomId: 'chest_tightness',       confidence: 0.90 }],
  pressure:    [{ symptomId: 'chest_pain_crushing',   confidence: 0.85 }],
  crushing:    [{ symptomId: 'chest_pain_crushing',   confidence: 0.92 }],
  squeezing:   [{ symptomId: 'chest_pain_crushing',   confidence: 0.88 }],
  heavy:       [{ symptomId: 'chest_tightness',       confidence: 0.78 }],
  stabbing:    [{ symptomId: 'chest_pain_sharp',      confidence: 0.88 }],
  sharp:       [{ symptomId: 'chest_pain_sharp',      confidence: 0.82 }],
  palpitation: [{ symptomId: 'palpitations',          confidence: 0.95 }],
  palpitations:[{ symptomId: 'palpitations',          confidence: 0.95 }],
  racing:      [{ symptomId: 'palpitations',          confidence: 0.85 }],
  pounding:    [{ symptomId: 'palpitations',          confidence: 0.82 }],
  fluttering:  [{ symptomId: 'palpitations',          confidence: 0.88 }],
  flutter:     [{ symptomId: 'palpitations',          confidence: 0.88 }],
  skipping:    [{ symptomId: 'palpitations',          confidence: 0.85 }],
  irregular:   [{ symptomId: 'palpitations',          confidence: 0.78 }],
  fast:        [{ symptomId: 'palpitations',          confidence: 0.72 }],

  // ── Cardiac red flags ──
  jaw:         [{ symptomId: 'arm_jaw_pain',          confidence: 0.92 }],
  arm:         [{ symptomId: 'arm_jaw_pain',          confidence: 0.78 }],
  radiating:   [{ symptomId: 'arm_jaw_pain',          confidence: 0.85 }],
  spreading:   [{ symptomId: 'arm_jaw_pain',          confidence: 0.80 }],

  // ── Respiratory ──
  breath:      [{ symptomId: 'sob_rest',              confidence: 0.85 }],
  breathless:  [{ symptomId: 'sob_rest',              confidence: 0.90 }],
  breathing:   [{ symptomId: 'sob_rest',              confidence: 0.82 }],
  suffocating: [{ symptomId: 'sob_rest',              confidence: 0.88 }],
  wheezing:    [{ symptomId: 'wheezing',              confidence: 0.92 }],
  wheeze:      [{ symptomId: 'wheezing',              confidence: 0.92 }],
  coughing:    [{ symptomId: 'cough',                 confidence: 0.90 }],
  cough:       [{ symptomId: 'cough',                 confidence: 0.90 }],

  // ── Neurological ──
  headache:    [{ symptomId: 'headache_mild',         confidence: 0.88 },
                { symptomId: 'severe_headache',       confidence: 0.72 }],
  thunderclap: [{ symptomId: 'severe_headache',       confidence: 0.97 }],
  migraine:    [{ symptomId: 'severe_headache',       confidence: 0.85 }],
  dizzy:       [{ symptomId: 'dizziness',             confidence: 0.90 }],
  dizziness:   [{ symptomId: 'dizziness',             confidence: 0.92 }],
  lightheaded: [{ symptomId: 'dizziness',             confidence: 0.88 }],
  spinning:    [{ symptomId: 'dizziness',             confidence: 0.85 }],
  vertigo:     [{ symptomId: 'dizziness',             confidence: 0.90 }],
  confused:    [{ symptomId: 'confusion',             confidence: 0.88 }],
  confusion:   [{ symptomId: 'confusion',             confidence: 0.92 }],
  disoriented: [{ symptomId: 'confusion',             confidence: 0.85 }],
  vision:      [{ symptomId: 'vision_changes',        confidence: 0.80 }],
  blurry:      [{ symptomId: 'vision_changes',        confidence: 0.85 }],
  double:      [{ symptomId: 'vision_changes',        confidence: 0.78 }],
  drooping:    [{ symptomId: 'facial_droop',          confidence: 0.95 }],
  droop:       [{ symptomId: 'facial_droop',          confidence: 0.92 }],
  slurred:     [{ symptomId: 'slurred_speech',        confidence: 0.97 }],
  slurring:    [{ symptomId: 'slurred_speech',        confidence: 0.95 }],
  speech:      [{ symptomId: 'slurred_speech',        confidence: 0.75 }],
  weakness:    [{ symptomId: 'arm_jaw_pain',          confidence: 0.78 }],

  // ── Syncope ──
  faint:       [{ symptomId: 'syncope',              confidence: 0.88 }],
  fainting:    [{ symptomId: 'syncope',              confidence: 0.90 }],
  unconscious: [{ symptomId: 'syncope',              confidence: 0.95 }],
  blackout:    [{ symptomId: 'syncope',              confidence: 0.92 }],
  passed:      [{ symptomId: 'syncope',              confidence: 0.80 }],  // "passed out"

  // ── General / GI ──
  tired:       [{ symptomId: 'fatigue',              confidence: 0.85 }],
  exhausted:   [{ symptomId: 'fatigue',              confidence: 0.90 }],
  fatigue:     [{ symptomId: 'fatigue',              confidence: 0.95 }],
  fatigued:    [{ symptomId: 'fatigue',              confidence: 0.92 }],
  weak:        [{ symptomId: 'fatigue',              confidence: 0.78 }],
  nausea:      [{ symptomId: 'nausea_vomiting',      confidence: 0.92 }],
  nauseous:    [{ symptomId: 'nausea_vomiting',      confidence: 0.90 }],
  vomiting:    [{ symptomId: 'nausea_vomiting',      confidence: 0.95 }],
  vomit:       [{ symptomId: 'nausea_vomiting',      confidence: 0.92 }],
  sick:        [{ symptomId: 'nausea_vomiting',      confidence: 0.72 }],
  fever:       [{ symptomId: 'high_fever',           confidence: 0.90 }],
  temperature: [{ symptomId: 'high_fever',           confidence: 0.82 }],
  aching:      [{ symptomId: 'muscle_ache',          confidence: 0.82 }],
  aches:       [{ symptomId: 'muscle_ache',          confidence: 0.85 }],
  sore:        [{ symptomId: 'muscle_ache',          confidence: 0.78 }],
  back:        [{ symptomId: 'back_pain_sudden',     confidence: 0.75 }],

  // ── Allergic ──
  swelling:    [{ symptomId: 'severe_allergic',      confidence: 0.82 }],
  swollen:     [{ symptomId: 'severe_allergic',      confidence: 0.85 }],
  throat:      [{ symptomId: 'severe_allergic',      confidence: 0.88 }],
  hives:       [{ symptomId: 'severe_allergic',      confidence: 0.85 }],
  allergic:    [{ symptomId: 'severe_allergic',      confidence: 0.90 }],

  // ── Anxiety / Panic ──
  anxiety:     [{ symptomId: 'anxiety_physical',     confidence: 0.88 }],
  anxious:     [{ symptomId: 'anxiety_physical',     confidence: 0.85 }],
  panic:       [{ symptomId: 'anxiety_physical',     confidence: 0.85 }],
  worried:     [{ symptomId: 'anxiety_physical',     confidence: 0.75 }],
}

export function detectSymptomsFromText(text: string): NLPResult {
  if (!text || text.trim().length === 0) {
    return { confirmed: [], uncertain: [] }
  }

  // Normalize: lowercase, split on whitespace and punctuation
  const words = text
    .toLowerCase()
    .split(/[\s,.\-!?;:()"']+/)
    .map(w => w.trim())
    .filter(w => w.length > 2)  // skip very short words like "a", "is", "my"

  // Also check two-word phrases (bigrams) for things like "passed out"
  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }

  const allTokens = [...words, ...bigrams]

  // Collect all matches, keeping highest confidence per symptom
  const bestMatch = new Map<string, number>()  // symptomId → best confidence

  for (const token of allTokens) {
    const matches = KEYWORD_MAP[token]
    if (!matches) continue

    for (const match of matches) {
      const current = bestMatch.get(match.symptomId) ?? 0
      if (match.confidence > current) {
        bestMatch.set(match.symptomId, match.confidence)
      }
    }
  }

  // Separate into confirmed vs uncertain buckets
  const confirmed: NLPMatch[] = []
  const uncertain: NLPMatch[] = []

  for (const [symptomId, confidence] of bestMatch.entries()) {
    if (confidence >= 0.85) {
      confirmed.push({ symptomId, confidence })
    } else if (confidence >= 0.70) {
      uncertain.push({ symptomId, confidence })
    }
    // < 0.70 is silently dropped
  }

  // Sort by confidence descending (most certain first)
  confirmed.sort((a, b) => b.confidence - a.confidence)
  uncertain.sort((a, b) => b.confidence - a.confidence)

  return { confirmed, uncertain }
}