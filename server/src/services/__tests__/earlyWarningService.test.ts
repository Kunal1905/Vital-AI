import { describe, expect, it } from 'vitest'
import { detectRecurringEpisodeWarning } from '../earlyWarningService'

describe('detectRecurringEpisodeWarning', () => {
  const now = new Date('2026-04-26T10:00:00.000Z')

  it('alerts when there are multiple high-risk episodes in 72 hours', () => {
    const result = detectRecurringEpisodeWarning(
      [
        { createdAt: '2026-04-26T08:00:00.000Z', riskScore: 8.1 },
        { createdAt: '2026-04-25T09:00:00.000Z', riskScore: 7.4 },
        { createdAt: '2026-04-24T12:00:00.000Z', riskScore: 3.2 },
      ],
      now,
    )

    expect(result.shouldAlert).toBe(true)
    expect(result.reason).toBe('multiple_high_risk_episodes')
    expect(result.highRiskCount).toBe(2)
  })

  it('alerts when moderate-or-worse episodes repeat frequently', () => {
    const result = detectRecurringEpisodeWarning(
      [
        { createdAt: '2026-04-26T08:00:00.000Z', riskScore: 5.1 },
        { createdAt: '2026-04-25T18:00:00.000Z', riskScore: 4.6 },
        { createdAt: '2026-04-24T14:00:00.000Z', riskScore: 4.2 },
      ],
      now,
    )

    expect(result.shouldAlert).toBe(true)
    expect(result.reason).toBe('repeated_moderate_or_worse_episodes')
    expect(result.moderateOrWorseCount).toBe(3)
  })

  it('does not alert when risky sessions are too sparse or too old', () => {
    const result = detectRecurringEpisodeWarning(
      [
        { createdAt: '2026-04-23T07:00:00.000Z', riskScore: 7.2 },
        { createdAt: '2026-04-22T06:00:00.000Z', riskScore: 4.8 },
        { createdAt: '2026-04-20T05:00:00.000Z', riskScore: 5.0 },
      ],
      now,
    )

    expect(result.shouldAlert).toBe(false)
    expect(result.reason).toBeNull()
  })
})
