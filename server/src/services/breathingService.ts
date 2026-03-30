type BreathingExerciseId = "box" | "478" | "belly" | "coherent";

type BreathingSelectInput = {
  symptomSlugs: string[];
  stressScore: number;
  panicScore: number;
};

const PANIC_PATTERN_SYMPTOMS = ["palpitations", "sob_rest", "anxiety_physical", "chest_tightness"];
const BREATHING_SYMPTOMS = ["sob_exertion", "chest_tightness", "wheezing", "sob_rest"];
const MUSCLE_TENSION_SYMPTOMS = ["muscle_ache", "back_pain_sudden", "headache_mild"];
const FATIGUE_SYMPTOMS = ["fatigue", "fatigue-unusual-weakness"];

export function selectBreathingExercise(input: BreathingSelectInput): BreathingExerciseId {
  const { symptomSlugs, stressScore, panicScore } = input;
  const hasSymptom = (list: string[]) => list.some((slug) => symptomSlugs.includes(slug));

  if (panicScore >= 2 || hasSymptom(PANIC_PATTERN_SYMPTOMS)) return "box";
  if (hasSymptom(BREATHING_SYMPTOMS)) return "coherent";
  if (hasSymptom(MUSCLE_TENSION_SYMPTOMS)) return "478";
  if (hasSymptom(FATIGUE_SYMPTOMS)) return "belly";
  if (stressScore >= 7) return "478";
  return "belly";
}
