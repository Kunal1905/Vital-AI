import { NextFunction, Request, Response } from 'express'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../config/db'
import { alertLog, emergencyContacts, familyAlertLog, users } from '../models'

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

function parseLimit(raw: string | undefined, fallback = 20, max = 100): number {
  const parsed = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), max)
}

export async function getAlertLogEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const limit = parseLimit(req.query.limit as string | undefined)
    const alertType = (req.query.alertType as string | undefined)?.trim()
    const status = (req.query.status as string | undefined)?.trim()

    const filters = [eq(alertLog.userId, user.id)]
    if (alertType) filters.push(eq(alertLog.alertType, alertType))
    if (status) filters.push(eq(alertLog.status, status))

    const rows = await db
      .select()
      .from(alertLog)
      .where(and(...filters))
      .orderBy(desc(alertLog.createdAt))
      .limit(limit)

    return res.json({
      count: rows.length,
      alerts: rows,
    })
  } catch (error) {
    next(error)
  }
}

export async function getFamilyAlertLogEntries(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const limit = parseLimit(req.query.limit as string | undefined)
    const triggerType = (req.query.triggerType as string | undefined)?.trim()

    const filters = [eq(familyAlertLog.userId, user.id)]
    if (triggerType) filters.push(eq(familyAlertLog.triggerType, triggerType))

    const rows = await db
      .select({
        id: familyAlertLog.id,
        userId: familyAlertLog.userId,
        contactId: familyAlertLog.contactId,
        contactName: emergencyContacts.name,
        relation: emergencyContacts.relation,
        sessionId: familyAlertLog.sessionId,
        triggerType: familyAlertLog.triggerType,
        messageTemplate: familyAlertLog.messageTemplate,
        messageSent: familyAlertLog.messageSent,
        status: familyAlertLog.status,
        delivered: familyAlertLog.delivered,
        deliveryError: familyAlertLog.deliveryError,
        response: familyAlertLog.response,
        sentAt: familyAlertLog.sentAt,
        createdAt: familyAlertLog.createdAt,
      })
      .from(familyAlertLog)
      .leftJoin(emergencyContacts, eq(familyAlertLog.contactId, emergencyContacts.id))
      .where(and(...filters))
      .orderBy(desc(familyAlertLog.createdAt))
      .limit(limit)

    return res.json({
      count: rows.length,
      alerts: rows,
    })
  } catch (error) {
    next(error)
  }
}
