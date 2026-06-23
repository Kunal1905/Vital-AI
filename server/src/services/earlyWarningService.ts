export interface RecentRiskRow {
  createdAt: Date | string
  riskScore: number
}

export interface RecurringEpisodeWarningResult {
  shouldAlert: boolean
  windowHours: number
  totalEpisodes: number
  moderateOrWorseCount: number
  highRiskCount: number
  maxRiskScore: number
  reason: string | null
}

const MODERATE_THRESHOLD = 4
const HIGH_THRESHOLD = 7
const DEFAULT_WINDOW_HOURS = 72

export function detectRecurringEpisodeWarning(
  rows: RecentRiskRow[],
  now = new Date(),
  windowHours = DEFAULT_WINDOW_HOURS,
): RecurringEpisodeWarningResult {
  const windowStart = now.getTime() - windowHours * 60 * 60 * 1000

  const recent = rows.filter((row) => {
    const createdAt = new Date(row.createdAt).getTime()
    return Number.isFinite(createdAt) && createdAt >= windowStart
  })

  const moderateOrWorse = recent.filter((row) => row.riskScore >= MODERATE_THRESHOLD)
  const highRisk = recent.filter((row) => row.riskScore >= HIGH_THRESHOLD)
  const maxRiskScore = recent.reduce((max, row) => Math.max(max, row.riskScore), 0)

  let reason: string | null = null

  if (highRisk.length >= 2) {
    reason = 'multiple_high_risk_episodes'
  } else if (moderateOrWorse.length >= 3) {
    reason = 'repeated_moderate_or_worse_episodes'
  }

  return {
    shouldAlert: reason !== null,
    windowHours,
    totalEpisodes: recent.length,
    moderateOrWorseCount: moderateOrWorse.length,
    highRiskCount: highRisk.length,
    maxRiskScore,
    reason,
  }
}
