import { db } from '../config/db'
import { alertLog, emergencyContacts, familyAlertLog } from '../models'
import { eq } from 'drizzle-orm'

const ONESIGNAL_API_URL =
  process.env.ONESIGNAL_API_URL ?? 'https://api.onesignal.com/notifications'

type TriggerType = 'red_flag' | 'high_risk' | 'manual' | 'inactivity'
type AlertType =
  | 'escalation_day7'
  | 'escalation_day10'
  | 'escalation_day14'
  | 'trend_spike'
  | 'new_peak'

interface EmergencyContactRow {
  id: number
  userId: number
  name: string
  phone: string
  email?: string | null
  pushSubscriptionId?: string | null
  relation: string
  isPrimary: boolean
  notifyOnHighRisk: boolean
  notifyOnRedFlag: boolean
  notifyOnManual: boolean
  notifyOnInactivity?: boolean
  includeSymptomName: boolean
  includeRiskScore: boolean
}

function getOneSignalConfig(): { appId: string; apiKey: string } | null {
  const appId = process.env.ONESIGNAL_APP_ID
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  if (!appId || !apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY must be set in production')
    }
    console.warn('OneSignal not configured — push notifications will be logged only')
    return null
  }

  return { appId, apiKey }
}

function buildFamilyAlertMessage(
  contact: EmergencyContactRow,
  triggerType: TriggerType,
  redFlagsDetected: string[],
  triageLevel: string,
  riskScore?: number,
  primarySymptom?: string
): string {
  const userName = 'Your contact'

  if (triggerType === 'red_flag' || triageLevel === 'emergency') {
    let msg =
      `VITAL ALERT: ${userName} logged a symptom that may require emergency care. ` +
      'Please try to reach them now.'
    if (contact.includeSymptomName && primarySymptom) {
      msg += ` Reported symptom: ${primarySymptom}.`
    }
    msg += ' — Vital Health App'
    return msg
  }

  if (triggerType === 'high_risk') {
    let msg = `VITAL: ${userName}'s health app flagged their recent symptoms as high risk.`
    if (contact.includeRiskScore && riskScore !== undefined) {
      msg += ` Risk score: ${riskScore}/10.`
    }
    msg += ' Please check in with them. — Vital Health App'
    return msg
  }

  if (triggerType === 'inactivity') {
    return `VITAL: ${userName} has not checked in with their health app recently. You may want to reach out. — Vital Health App`
  }

  return `${userName} wanted to let you know they're not feeling great today and used Vital to check their symptoms. No emergency — just a heads up. — Vital Health App`
}

async function sendOneSignalNotification(params: {
  subscriptionId: string
  heading: string
  content: string
  data?: Record<string, unknown>
}): Promise<{ delivered: boolean; error?: string }> {
  const config = getOneSignalConfig()
  if (!config) {
    console.log(`[DEV PUSH] To subscription: ${params.subscriptionId}`)
    console.log(`[DEV PUSH] ${params.heading}: ${params.content}`)
    return { delivered: true }
  }

  const payload = {
    app_id: config.appId,
    target_channel: 'push',
    include_subscription_ids: [params.subscriptionId],
    headings: { en: params.heading },
    contents: { en: params.content },
    data: params.data ?? {},
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    return { delivered: false, error: `OneSignal error ${response.status}: ${text}` }
  }

  return { delivered: true }
}

export async function triggerFamilyAlert(
  contact: EmergencyContactRow,
  triageLevel: string,
  redFlagsDetected: string[],
  sessionId: number | null,
  riskScore?: number,
  primarySymptom?: string
): Promise<void> {
  const triggerType: TriggerType =
    redFlagsDetected.length > 0 ? 'red_flag' :
    triageLevel === 'emergency' ? 'red_flag' :
    triageLevel === 'high'      ? 'high_risk' :
    'manual'

  const message = buildFamilyAlertMessage(
    contact,
    triggerType,
    redFlagsDetected,
    triageLevel,
    riskScore,
    primarySymptom
  )

  let delivered = false
  let deliveryError: string | undefined

  if (!contact.pushSubscriptionId) {
    deliveryError = 'Emergency contact does not have a push subscription id'
    console.warn(deliveryError)
  } else {
    try {
      const result = await sendOneSignalNotification({
        subscriptionId: contact.pushSubscriptionId,
        heading: 'Vital Alert',
        content: message,
        data: {
          sessionId,
          triageLevel,
          triggerType,
          riskScore,
        },
      })
      delivered = result.delivered
      deliveryError = result.error
    } catch (err: any) {
      deliveryError = err?.message ?? 'Unknown OneSignal error'
      console.error(`Push alert failed for contact ${contact.id}:`, deliveryError)
    }
  }

  await db.insert(familyAlertLog).values({
    userId: contact.userId,
    contactId: contact.id,
    sessionId,
    triggerType,
    messageTemplate: triggerType,
    messageSent: message,
    sentAt: new Date(),
    delivered,
    deliveryError: deliveryError ?? null,
  })
}

export async function sendEscalationAlert(
  userId: number,
  alertType: AlertType,
  daysSinceLastLog: number,
  lastRiskScore?: number
): Promise<void> {
  const messages: Record<AlertType, string> = {
    escalation_day7:
      `Vital: We haven't received an update in a week. Your trend was rising before you went quiet. How are you feeling today? Open the app to check in.`,
    escalation_day10:
      `Vital: It's been 10 days since your last check-in. If things have improved, let us know. If not, today is a good day to log. Your trend data matters.`,
    escalation_day14:
      `Vital: It's been 2 weeks. Are you okay? Your last sessions showed a rising trend. Please check in when you can, or speak to a doctor if symptoms have continued.`,
    trend_spike:
      `Vital: Your risk trend rose significantly over the past week. No action needed right now, but worth keeping an eye on. Log your current symptoms to update your trend.`,
    new_peak:
      `Vital: You reached a new personal high in your risk score. If you're feeling better now, log it — it helps your trend data. If not, consider speaking to a doctor.`,
  }

  const messageText = messages[alertType]

  console.log(`[ESCALATION ALERT] User ${userId}: ${messageText}`)

  await db.insert(alertLog).values({
    userId,
    alertType,
    severity: alertType.startsWith('escalation') ? 'warning' : 'info',
    channel: 'in_app',
    status: 'sent',
    message: `${messageText} (daysSinceLastLog=${daysSinceLastLog}${lastRiskScore !== undefined ? `, lastRiskScore=${lastRiskScore}` : ''})`,
  })
}

export async function getAlertableContacts(
  userId: number,
  triggerType: TriggerType
): Promise<EmergencyContactRow[]> {
  const contacts = await db
    .select()
    .from(emergencyContacts)
    .where(eq(emergencyContacts.userId, userId))

  const normalized: EmergencyContactRow[] = contacts.map((c) => ({
    id: c.id,
    userId: c.userId,
    name: c.name,
    phone: c.phone,
    email: c.email ?? null,
    pushSubscriptionId: c.pushSubscriptionId ?? null,
    relation: c.relation,
    isPrimary: c.isPrimary,
    notifyOnHighRisk: true,
    notifyOnRedFlag: true,
    notifyOnManual: true,
    notifyOnInactivity: true,
    includeSymptomName: true,
    includeRiskScore: true,
  }))

  return normalized.filter((c) => {
    if (triggerType === 'red_flag') return c.notifyOnRedFlag
    if (triggerType === 'high_risk') return c.notifyOnHighRisk
    if (triggerType === 'manual') return c.notifyOnManual
    if (triggerType === 'inactivity') return c.notifyOnInactivity ?? true
    return false
  })
}
