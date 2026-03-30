export type ExerciseId =
  | 'box_breathing'
  | 'progressive_muscle_relaxation'
  | 'grounding_54321'
  | 'gentle_movement'
  | 'cold_water_reset'
  | 'journaling_prompt'
  | 'posture_breathing_reset'

// Symptom groups used in selection logic
// Keeping these as constants makes the rules readable
const PANIC_PATTERN_SYMPTOMS = [
  'palpitations',
  'sob_rest',
  'anxiety_physical',
  'chest_tightness',
]

const MUSCLE_TENSION_SYMPTOMS = [
  'muscle_ache',
  'back_pain_sudden',
  'headache_mild',
]

const FATIGUE_SYMPTOMS = [
  'fatigue',
]

const BREATHING_SYMPTOMS = [
  'sob_exertion',
  'chest_tightness',
  'wheezing',
]

/**
 * Selects the most appropriate calming exercises for this session.
 *
 * Pure function. No DB calls. No side effects.
 * Returns an array of exercise IDs (max 2).
 */
export function selectExercises(
  symptomIds: string[],
  stressScore: number,
  panicScore: number
): ExerciseId[] {
  const selected: ExerciseId[] = []

  const hasSymptom = (list: string[]) =>
    list.some(s => symptomIds.includes(s))

  // ── Rule 1: Box breathing ────────────────────────────────
  // Best for: panic symptoms, palpitations, shortness of breath.
  // The extended exhale (4-4-6 pattern) activates the
  // parasympathetic nervous system via the vagus nerve.
  // Measurable heart rate reduction within 90 seconds.
  if (panicScore >= 2 || hasSymptom(PANIC_PATTERN_SYMPTOMS)) {
    selected.push('box_breathing')
  }

  // ── Rule 2: Grounding (5-4-3-2-1) ───────────────────────
  // Best for: high stress, dissociation, racing thoughts.
  // Forces the user to use all 5 senses — this interrupts
  // the anxiety loop by anchoring attention to the present.
  if (panicScore >= 3 || stressScore >= 8) {
    selected.push('grounding_54321')
  }

  // ── Rule 3: Progressive muscle relaxation ────────────────
  // Best for: physical tension — muscle aches, headaches, back pain.
  // Tense-and-release cycles work through muscle groups and
  // reduce the physical manifestation of stress in the body.
  if (
    selected.length < 2 &&
    hasSymptom(MUSCLE_TENSION_SYMPTOMS)
  ) {
    selected.push('progressive_muscle_relaxation')
  }

  // ── Rule 4: Gentle movement ──────────────────────────────
  // Best for: fatigue without acute illness.
  // Light movement improves circulation and reduces the
  // sluggishness that comes from fatigue or poor sleep.
  if (
    selected.length < 2 &&
    hasSymptom(FATIGUE_SYMPTOMS)
  ) {
    selected.push('gentle_movement')
  }

  // ── Rule 5: Cold water reset ─────────────────────────────
  // Best for: moderate stress when nothing higher-priority applies.
  // Splashing cold water triggers the diving reflex — the body's
  // automatic response to cold water on the face, which slows
  // heart rate and reduces adrenaline. Fast and highly effective.
  if (
    selected.length < 2 &&
    stressScore >= 7
  ) {
    selected.push('cold_water_reset')
  }

  // ── Rule 6: Posture and breathing reset ──────────────────
  // Best for: mild SOB or chest tightness with no red flags.
  // Poor posture physically restricts lung expansion. This
  // is common and often misattributed to cardiac causes.
  if (
    selected.length < 2 &&
    hasSymptom(BREATHING_SYMPTOMS) &&
    panicScore < 2
  ) {
    selected.push('posture_breathing_reset')
  }

  // ── Rule 7: Journaling prompt (fallback) ─────────────────
  // If we have no exercises yet but the user is moderately stressed,
  // a writing prompt externalizes worry and breaks the rumination loop.
  if (selected.length === 0 && stressScore >= 5) {
    selected.push('journaling_prompt')
  }

  // ── Final fallback ────────────────────────────────────────
  // If absolutely nothing triggered above, default to box breathing.
  // It's the most universally applicable exercise.
  if (selected.length === 0) {
    selected.push('box_breathing')
  }

  // Deduplicate (shouldn't happen but defensive) and cap at 2
  return [...new Set(selected)].slice(0, 2) as ExerciseId[]
}