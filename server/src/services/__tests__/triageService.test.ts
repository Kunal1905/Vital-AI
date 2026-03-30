import { describe, it, expect, beforeAll } from 'vitest'
import { computeTriage, setWeightsForTesting } from '../triageSrevice'

const healthyBaseline = {
  symptomIds: [] as string[],
  severity: 5,
  durationMinutes: 60,
  stressScore: 5,
  sleepHours: 7,
  age: 30,
  hasHypertension: false,
  hasDiabetes: false,
  hasHeartDisease: false,
  hasAsthma: false,
  emergencySensitivity: 0.5,
  panicFilterThreshold: 0.5,
  anxietyTendency: 'low' as const,
  panicAttackHistory: false,
}

beforeAll(() => {
  setWeightsForTesting(
    new Map([
      ['arm_jaw_pain', { weight: 5, isRedFlag: true }],
      ['facial_droop', { weight: 5, isRedFlag: true }],
      ['slurred_speech', { weight: 5, isRedFlag: true }],
      ['chest_pain_crushing', { weight: 5, isRedFlag: false }],
      ['sob_rest', { weight: 5, isRedFlag: false }],
      ['chest_tightness', { weight: 4, isRedFlag: false }],
      ['chest_pain_sharp', { weight: 4, isRedFlag: false }],
      ['palpitations', { weight: 3, isRedFlag: false }],
      ['dizziness', { weight: 3, isRedFlag: false }],
      ['nausea_vomiting', { weight: 2, isRedFlag: false }],
      ['fatigue', { weight: 2, isRedFlag: false }],
      ['headache_mild', { weight: 1, isRedFlag: false }],
      ['muscle_ache', { weight: 1, isRedFlag: false }],
    ]),
  )
})

describe('Red flag detection', () => {
  it('returns emergency immediately when red flag symptom present', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['arm_jaw_pain'],
    })
    expect(result.triageLevel).toBe('emergency')
    expect(result.acuteRiskScore).toBe(9.9)
    expect(result.redFlagsDetected).toContain('arm_jaw_pain')
  })

  it('bypasses all scoring when red flag present — severity 1 still returns emergency', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['arm_jaw_pain'],
      severity: 1,
    })
    expect(result.triageLevel).toBe('emergency')
  })

  it('detects stroke red flag symptoms', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['facial_droop'],
    })
    expect(result.triageLevel).toBe('emergency')
    expect(result.redFlagsDetected).toContain('facial_droop')
  })

  it('returns no red flags when none are present', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue'],
    })
    expect(result.redFlagsDetected).toHaveLength(0)
  })
})

describe('Triage level classification', () => {
  it('returns low for mild single symptom in healthy young person', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue'],
      severity: 3,
    })
    expect(result.triageLevel).toBe('low')
    expect(result.acuteRiskScore).toBeLessThan(4.0)
  })

  it('returns moderate for multiple symptoms at medium severity', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness', 'dizziness'],
      severity: 6,
      durationMinutes: 120,
    })
    expect(result.triageLevel).toBe('moderate')
    expect(result.acuteRiskScore).toBeGreaterThanOrEqual(4.0)
    expect(result.acuteRiskScore).toBeLessThan(7.0)
  })

  it('returns high for cardiac symptoms with hypertension in older patient', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness', 'palpitations'],
      severity: 7,
      age: 58,
      hasHypertension: true,
    })
    expect(result.triageLevel).toBe('high')
    expect(result.acuteRiskScore).toBeGreaterThanOrEqual(7.0)
  })

  it('chronic conditions increase the score', () => {
    const withoutConditions = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      severity: 6,
    })

    const withConditions = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      severity: 6,
      hasHypertension: true,
      hasHeartDisease: true,
    })

    expect(withConditions.acuteRiskScore).toBeGreaterThan(withoutConditions.acuteRiskScore)
  })

  it('older patients get higher scores for same symptoms', () => {
    const youngResult = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      age: 25,
    })

    const olderResult = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      age: 70,
    })

    expect(olderResult.acuteRiskScore).toBeGreaterThan(youngResult.acuteRiskScore)
  })
})

describe('Panic detection', () => {
  it('does not activate for calm user with real symptoms', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      stressScore: 3,
    })
    expect(result.panicFilterActivated).toBe(false)
  })

  it('activates when high stress + low risk score (classic mismatch)', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue'],
      stressScore: 9,
      severity: 4,
    })
    expect(result.panicFilterActivated).toBe(true)
    expect(result.panicScore).toBeGreaterThanOrEqual(2)
  })

  it('activates for known panic pattern: history + chest + SOB', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness', 'sob_rest'],
      panicAttackHistory: true,
      anxietyTendency: 'high',
    })
    expect(result.panicFilterActivated).toBe(true)
    expect(result.panicScore).toBeGreaterThanOrEqual(3)
  })

  it('reduces emergency probability when panic detected', () => {
    const calmResult = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      stressScore: 2,
    })

    const panicResult = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_tightness'],
      stressScore: 9,
      panicAttackHistory: true,
      anxietyTendency: 'high',
    })

    expect(panicResult.emergencyProbability).toBeLessThan(calmResult.emergencyProbability)
  })
})

describe('Score boundaries and edge cases', () => {
  it('score never exceeds 10.0', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['chest_pain_crushing', 'sob_rest', 'palpitations', 'dizziness'],
      severity: 10,
      durationMinutes: 10000,
      age: 85,
      hasHeartDisease: true,
      hasHypertension: true,
      hasDiabetes: true,
      hasAsthma: true,
      heartRate: 200,
      emergencySensitivity: 1.0,
    })
    expect(result.acuteRiskScore).toBeLessThanOrEqual(10.0)
  })

  it('score is at least 0', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: [],
    })
    expect(result.acuteRiskScore).toBeGreaterThanOrEqual(0)
  })

  it('no symptoms returns low risk', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: [],
    })
    expect(result.triageLevel).toBe('low')
  })

  it('elevated heart rate adds to score', () => {
    const withoutHR = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue'],
    })

    const withHighHR = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue'],
      heartRate: 145,
    })

    expect(withHighHR.acuteRiskScore).toBeGreaterThan(withoutHR.acuteRiskScore)
  })

  it('confidence is always between 40 and 95', () => {
    const result = computeTriage({
      ...healthyBaseline,
      symptomIds: ['fatigue', 'headache_mild', 'muscle_ache'],
      heartRate: 80,
    })
    expect(result.confidencePct).toBeGreaterThanOrEqual(40)
    expect(result.confidencePct).toBeLessThanOrEqual(95)
  })
})
