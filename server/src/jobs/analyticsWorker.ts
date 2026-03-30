import { db } from '../config/db'
import { sessions, riskAssessments, alertLog } from '../models'
import { and, desc, eq, gte } from 'drizzle-orm'
import { sendEscalationAlert } from '../services/notificationService'

export async function runAnalyticsWorker(): Promise<number> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const activeUsers = await db
    .selectDistinct({ userId: sessions.userId })
    .from(sessions)
    .where(gte(sessions.createdAt, thirtyDaysAgo))

  let processedCount = 0

  for (const { userId } of activeUsers) {
    try {
      await computeTrendSignals(userId)
      processedCount++
    } catch (err) {
      console.error(`[ANALYTICS] Failed for user ${userId}:`, err)
    }
  }

  return processedCount
}

async function computeTrendSignals(userId: number): Promise<void> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      createdAt: sessions.createdAt,
      riskScore: riskAssessments.riskScore,
    })
    .from(sessions)
    .leftJoin(riskAssessments, eq(riskAssessments.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), gte(sessions.createdAt, fourteenDaysAgo)))
    .orderBy(desc(sessions.createdAt))

  const recent = rows
    .filter((row) => row.riskScore !== null)
    .map((row) => ({ ...row, riskScore: Number(row.riskScore) }))

  if (recent.length < 4) return

  const last7 = recent.filter((row) => new Date(row.createdAt) > sevenDaysAgo)
  const prev7 = recent.filter((row) => {
    const created = new Date(row.createdAt)
    return created <= sevenDaysAgo && created >= fourteenDaysAgo
  })

  if (last7.length === 0 || prev7.length === 0) return

  const last7Avg = last7.reduce((sum, row) => sum + row.riskScore, 0) / last7.length
  const prev7Avg = prev7.reduce((sum, row) => sum + row.riskScore, 0) / prev7.length

  if (prev7Avg === 0) return

  const changePct = ((last7Avg - prev7Avg) / prev7Avg) * 100
  if (changePct < 20) return

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  const recentAlert = await db
    .select({ id: alertLog.id })
    .from(alertLog)
    .where(
      and(
        eq(alertLog.userId, userId),
        gte(alertLog.createdAt, threeDaysAgo),
        eq(alertLog.alertType, 'trend_spike')
      )
    )
    .limit(1)

  if (recentAlert.length > 0) return

  await sendEscalationAlert(userId, 'trend_spike', 0, last7[0]?.riskScore)
}
