import { db } from '../config/db'
import { sendEscalationAlert } from '../services/notificationService'
import { sql } from 'drizzle-orm'

type EscalationAlertType = 'escalation_day7' | 'escalation_day10' | 'escalation_day14'

function pickNextEscalationAlert(
  daysSince: number,
  sentAlertTypes: Set<string>,
): EscalationAlertType | null {
  if (daysSince >= 14 && !sentAlertTypes.has('escalation_day14')) {
    return 'escalation_day14'
  }

  if (daysSince >= 10 && !sentAlertTypes.has('escalation_day10')) {
    return 'escalation_day10'
  }

  if (daysSince >= 7 && !sentAlertTypes.has('escalation_day7')) {
    return 'escalation_day7'
  }

  return null
}

export async function runEscalationChecker(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const candidates = await db.execute(sql`
    SELECT
      s.user_id,
      MAX(s.created_at) AS last_log_date,
      (
        SELECT ra.risk_level
        FROM risk_assessments ra
        JOIN sessions s2 ON s2.id = ra.session_id
        WHERE s2.user_id = s.user_id
        ORDER BY s2.created_at DESC
        LIMIT 1
      ) AS last_risk_level,
      (
        SELECT ra.risk_score
        FROM risk_assessments ra
        JOIN sessions s2 ON s2.id = ra.session_id
        WHERE s2.user_id = s.user_id
        ORDER BY s2.created_at DESC
        LIMIT 1
      ) AS last_risk_score
    FROM sessions s
    GROUP BY s.user_id
    HAVING MAX(s.created_at) < ${sevenDaysAgo}
    LIMIT 200
  `)

  let alertedCount = 0

  for (const row of candidates.rows as any[]) {
    try {
      if (!['moderate', 'high', 'emergency'].includes(row.last_risk_level)) {
        continue
      }

      const daysSince = Math.floor(
        (Date.now() - new Date(row.last_log_date).getTime()) / (1000 * 60 * 60 * 24)
      )

      const sentAlertsResult = await db.execute(sql`
        SELECT alert_type
        FROM alert_log
        WHERE user_id = ${row.user_id}
          AND alert_type LIKE 'escalation_%'
      `)

      const sentAlertTypes = new Set(
        (sentAlertsResult.rows as Array<{ alert_type: string | null }>)
          .map((alert) => alert.alert_type)
          .filter((alertType): alertType is string => Boolean(alertType))
      )

      const alertType = pickNextEscalationAlert(daysSince, sentAlertTypes)
      if (!alertType) {
        continue
      }

      await sendEscalationAlert(
        row.user_id,
        alertType,
        daysSince,
        row.last_risk_score
      )

      alertedCount++
    } catch (err) {
      console.error(`[ESCALATION] Failed for user ${row.user_id}:`, err)
    }
  }

  return alertedCount
}
