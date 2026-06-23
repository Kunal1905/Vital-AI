import { db } from '../config/db'
import { sql } from 'drizzle-orm'
import { alertLog } from '../models'
import { and, eq, gte } from 'drizzle-orm'
import { sendEscalationAlert } from '../services/notificationService'

type TrendRow = {
  user_id: number
  last7_avg: string | null
  prev7_avg: string | null
  last7_count: number
  last7_first_score: number | null
}

export async function runAnalyticsWorker(): Promise<number> {
  // One query for every active user instead of two queries per user in a loop.
  const result = await db.execute<TrendRow>(sql`
    with recent as (
      select
        s.user_id,
        ra.risk_score,
        s.created_at,
        case when s.created_at > now() - interval '7 days' then 'last7' else 'prev7' end as bucket
      from sessions s
      join risk_assessments ra on ra.session_id = s.id
      where s.created_at > now() - interval '14 days'
    )
    select
      user_id,
      avg(risk_score) filter (where bucket = 'last7') as last7_avg,
      avg(risk_score) filter (where bucket = 'prev7') as prev7_avg,
      count(*) filter (where bucket = 'last7')::int as last7_count,
      (array_agg(risk_score order by created_at desc) filter (where bucket = 'last7'))[1] as last7_first_score
    from recent
    group by user_id
  `)

  let processedCount = 0

  for (const row of result.rows as unknown as TrendRow[]) {
    try {
      const handled = await maybeSendTrendAlert(row)
      if (handled) processedCount++
    } catch (err) {
      console.error(`[ANALYTICS] Failed for user ${row.user_id}:`, err)
    }
  }

  return processedCount
}

async function maybeSendTrendAlert(row: TrendRow): Promise<boolean> {
  const { user_id: userId, last7_avg, prev7_avg, last7_count, last7_first_score } = row

  if (last7_avg === null || prev7_avg === null || last7_count === 0) return false

  const last7Avg = Number(last7_avg)
  const prev7Avg = Number(prev7_avg)
  if (prev7Avg === 0) return false

  const changePct = ((last7Avg - prev7Avg) / prev7Avg) * 100
  if (changePct < 20) return false

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

  if (recentAlert.length > 0) return false

  await sendEscalationAlert(userId, 'trend_spike', 0, last7_first_score ?? undefined)
  return true
}