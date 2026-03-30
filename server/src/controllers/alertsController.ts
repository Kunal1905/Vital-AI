import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../config/db'
import { alertLog, users } from '../models'
import { eq, desc } from 'drizzle-orm'

function getAuthUserId(req: Request): string | undefined {
  const authUserId = (req as any).auth?.userId as string | undefined
  const testUserId = req.headers['x-test-user-id'] as string | undefined
  return authUserId ?? testUserId
}

async function getDbUser(req: Request) {
  const authUserId = getAuthUserId(req)
  if (!authUserId) return null
  const [user] = await db.select().from(users).where(eq(users.clerkUserId, authUserId))
  return user ?? null
}

function isResponded(status: string) {
  return status.startsWith('responded:')
}

function parseResponseType(status: string): string | null {
  if (!status.startsWith('responded:')) return null
  return status.replace('responded:', '')
}

export async function getAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
    const unreadOnly = req.query.unreadOnly === 'true'

    const alerts = await db
      .select()
      .from(alertLog)
      .where(eq(alertLog.userId, user.id))
      .orderBy(desc(alertLog.createdAt))
      .limit(limit)

    const enriched = alerts.map((alert) => ({
      ...alert,
      responseType: parseResponseType(alert.status),
    }))

    const unrespondedCount = alerts.filter((alert) => !isResponded(alert.status)).length
    const filtered = unreadOnly ? enriched.filter((alert) => !isResponded(alert.status)) : enriched

    res.json({
      alerts: filtered,
      unrespondedCount,
    })
  } catch (error) {
    next(error)
  }
}

export async function respondToAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const alertId = Number.parseInt(rawId ?? '', 10)
    if (!Number.isFinite(alertId)) {
      return res.status(400).json({ error: 'Invalid alert id' })
    }

    const schema = z.object({
      responseType: z.enum([
        'logged_symptoms',
        'confirmed_ok',
        'requested_help',
        'dismissed',
      ]),
    })
    const { responseType } = schema.parse(req.body)

    const [alert] = await db
      .select()
      .from(alertLog)
      .where(eq(alertLog.id, alertId))

    if (!alert || alert.userId !== user.id) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    if (isResponded(alert.status)) {
      return res.json({
        success: true,
        alreadyResponded: true,
        responseType: parseResponseType(alert.status),
      })
    }

    const [updated] = await db
      .update(alertLog)
      .set({
        status: `responded:${responseType}`,
      })
      .where(eq(alertLog.id, alertId))
      .returning()

    res.json({ success: true, alert: { ...updated, responseType } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues })
    }
    next(error)
  }
}
