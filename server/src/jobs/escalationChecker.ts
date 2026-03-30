import { db } from '../config/db'
import { sendEscalationAlert } from '../services/notificationService'
import { sql } from 'drizzle-orm'

export async function runEscalationChecker(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

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
      AND s.user_id NOT IN (
        SELECT DISTINCT user_id
        FROM alert_log
        WHERE created_at > ${threeDaysAgo}
          AND alert_type LIKE 'escalation_%'
      )
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

      const alertType =
        daysSince <= 8 ? 'escalation_day7'
        : daysSince <= 11 ? 'escalation_day10'
        : 'escalation_day14'

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
