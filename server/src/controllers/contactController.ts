import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { db } from '../config/db'
import { emergencyContacts, users } from '../models'
import { eq } from 'drizzle-orm'
import { triggerFamilyAlert } from '../services/notificationService'
 
// Used for updating the contact details.
const updateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^[\d\s\+\-\(\)]+$/, 'Invalid phone format')
    .optional(),
  email: z.string().email().optional(),
  pushSubscriptionId: z.string().min(1).max(200).optional(),
  relation: z.enum(['partner', 'parent', 'child', 'sibling', 'friend', 'other', 'family']).optional(),
  relationship: z.enum(['partner', 'parent', 'child', 'sibling', 'friend', 'other', 'family']).optional(),
  isPrimary: z.boolean().optional(),
})
 
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

// ── Helper: find the user's single contact ──────────────────
async function findContact(userId: number) {
  const results = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, userId))

  if (results.length === 0) return null

  return results[0]
}
 
 
// ============================================================
// FUNCTION 1: getContact
// GET /api/contacts
// Returns the user's single emergency contact
// ============================================================
 
export async function getContact(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const contact = await findContact(user.id)
 
    // If no contact found (not set up yet or soft-deleted)
    // return 404 with a specific code so the frontend knows
    // to show "no contact set up" state vs a generic error
    if (!contact) {
      return res.status(404).json({
        error: 'No emergency contact found',
        code:  'NO_CONTACT',
      })
    }
 
    res.json({ contact })
  } catch (error) {
    next(error)
  }
}
 
 
// ============================================================
// FUNCTION 2: updateContact
// PUT /api/contacts
// Updates the user's emergency contact details or preferences
// ============================================================
 
export async function updateContact(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateContactSchema.parse(req.body)
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }
 
    // Find their existing contact
    const existing = await findContact(user.id)

    if (!existing) {
      if (!data.name || !data.phone) {
        return res.status(404).json({
          error: 'No emergency contact found. Provide name and phone to create one.',
          code:  'NO_CONTACT',
        })
      }

      const relation = data.relation ?? data.relationship ?? 'family'
      const [created] = await db
        .insert(emergencyContacts)
        .values({
          userId: user.id,
          name: data.name,
          phone: data.phone,
          email: data.email ?? null,
          relation,
          isPrimary: data.isPrimary ?? false,
          pushSubscriptionId: data.pushSubscriptionId ?? null,
        })
        .returning()

      return res.status(201).json({ contact: created, created: true })
    }

    const relation = data.relation ?? data.relationship
    const updatePayload = {
      ...(data.name ? { name: data.name } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.pushSubscriptionId ? { pushSubscriptionId: data.pushSubscriptionId } : {}),
      ...(relation ? { relation } : {}),
      ...(typeof data.isPrimary === 'boolean' ? { isPrimary: data.isPrimary } : {}),
    }

    // Update only the fields that were sent
    // Drizzle's .set() with spread means unchanged fields
    // keep their existing values in the DB
    const [updated] = await db
      .update(emergencyContacts)
      .set(updatePayload)
      .where(eq(emergencyContacts.userId, user.id))
      .returning()
 
    res.json({ contact: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues })
    }
    next(error)
  }
}
 
 
// ============================================================
// FUNCTION 3: removeContact
// DELETE /api/contacts
// Soft-deletes the user's emergency contact
// Sets isActive = false — does NOT delete the row
// ============================================================
 
export async function removeContact(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const existing = await findContact(user.id)
 
    if (!existing) {
      return res.status(404).json({
        error: 'No emergency contact found',
        code:  'NO_CONTACT',
      })
    }
 
    await db
      .delete(emergencyContacts)
      .where(eq(emergencyContacts.userId, user.id))
 
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}
 
 
// ============================================================
// FUNCTION 4: restoreContact
// POST /api/contacts/restore
// Re-activates a previously soft-deleted contact
// So the user doesn't have to re-enter all their details
// ============================================================
 
export async function restoreContact(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const existing = await findContact(user.id)
 
    if (!existing) {
      return res.status(404).json({
        error: 'No contact found to restore',
        code:  'NO_CONTACT',
      })
    }
 
    return res.status(400).json({
      error: 'Contact restore is not supported. Please update your contact details instead.',
      code: 'CONTACT_RESTORE_UNSUPPORTED',
    })
  } catch (error) {
    next(error)
  }
}
 
 
// ============================================================
// FUNCTION 5: manualAlert
// POST /api/contacts/alert
// User manually triggers a push alert to their emergency contact
// ============================================================
 
export async function manualAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req)
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const contact = await findContact(user.id)
 
    if (!contact) {
      return res.status(404).json({
        error: 'No emergency contact found',
        code:  'NO_CONTACT',
      })
    }
 
    // Fire and forget — respond immediately, SMS sends in background
    triggerFamilyAlert(
      {
        id: contact.id,
        userId: contact.userId,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        pushSubscriptionId: contact.pushSubscriptionId,
        relation: contact.relation,
        isPrimary: contact.isPrimary,
        notifyOnHighRisk: true,
        notifyOnRedFlag: true,
        notifyOnManual: true,
        includeSymptomName: true,
        includeRiskScore: true,
      },
      'manual',
      [],
      null,
    )
      .catch(err => console.error('Manual alert failed:', err))
 
    res.json({
      success: true,
      message: `Alert sent to ${contact.name}`,
    })
  } catch (error) {
    next(error)
  }
}
