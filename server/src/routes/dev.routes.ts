import { Router } from 'express'
import { and, eq, gte, sql } from 'drizzle-orm'
import { runEscalationChecker } from '../jobs/escalationChecker'
import { runAnalyticsWorker } from '../jobs/analyticsWorker'
import { db } from '../config/db'
import {
  alertLog,
  riskAssessments,
  riskHistory,
  sessionSymptoms,
  sessionVitals,
  sessions,
  symptoms,
  users,
} from '../models'
import { detectSymptomsFromText } from '../services/nlpService'
import { selectExercises } from '../services/exerciseService'
import { computeTriage, loadSymptomWeights } from '../services/triageSrevice'

const router = Router()

router.use((req, res, next) => {
  const secret = process.env.DEV_ROUTES_SECRET
  if (!secret) return next()
  const provided = req.header('x-dev-secret')
  if (provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
})

router.post('/run-escalation', async (_req, res) => {
  const count = await runEscalationChecker()
  res.json({ alerted: count })
})

router.post('/run-analytics', async (_req, res) => {
  const count = await runAnalyticsWorker()
  res.json({ processed: count })
})

router.get('/test-suite', async (req, res) => {
  try {
    const results: Array<{
      name: string
      status: 'pass' | 'fail' | 'skip'
      details?: string
    }> = []

    const clerkId = req.header('x-test-user-id')
    const rawUserId = req.query.userId ? Number(req.query.userId) : null

    let userId: number | null = null
    if (Number.isFinite(rawUserId)) {
      userId = rawUserId as number
    } else if (clerkId) {
      const [user] = await db.select().from(users).where(eq(users.clerkUserId, clerkId))
      userId = user?.id ?? null
    }

    if (!userId) {
      return res.status(400).json({
        error: 'Provide a valid user via x-test-user-id (Clerk ID) or ?userId=',
      })
    }

    await loadSymptomWeights(db)

    const pushResult = (name: string, status: 'pass' | 'fail' | 'skip', details?: string) => {
      results.push({ name, status, details })
    }

    // ── NLP tests ─────────────────────────────────────────────
    const nlpPrimary = detectSymptomsFromText(
      'my chest has been tight and I keep feeling short of breath',
    )
    const confirmedIds = nlpPrimary.confirmed.map((m) => m.symptomId)
    const nlpConfirmedOk =
      confirmedIds.includes('chest_tightness') && confirmedIds.includes('sob_rest')
    pushResult(
      'nlp_confirmed_detection',
      nlpConfirmedOk ? 'pass' : 'fail',
      nlpConfirmedOk ? undefined : `confirmed=${confirmedIds.join(',')}`,
    )

    const nlpUncertain = detectSymptomsFromText('my heart feels fast')
    const uncertainIds = nlpUncertain.uncertain.map((m) => m.symptomId)
    const nlpUncertainOk =
      uncertainIds.includes('palpitations') && nlpUncertain.confirmed.length === 0
    pushResult(
      'nlp_uncertain_bucket',
      nlpUncertainOk ? 'pass' : 'fail',
      nlpUncertainOk ? undefined : `uncertain=${uncertainIds.join(',')}`,
    )

    const nlpGibberish = detectSymptomsFromText('xyz abc blah nothing here')
    const nlpGibberishOk =
      nlpGibberish.confirmed.length === 0 && nlpGibberish.uncertain.length === 0
    pushResult(
      'nlp_gibberish_empty',
      nlpGibberishOk ? 'pass' : 'fail',
      nlpGibberishOk ? undefined : `confirmed=${nlpGibberish.confirmed.length}, uncertain=${nlpGibberish.uncertain.length}`,
    )

    // ── Panic detection logic (pure) ──────────────────────────
    const [sampleSymptom] = await db
      .select({ id: symptoms.id })
      .from(symptoms)
      .where(eq(symptoms.isActive, true))
      .limit(1)
    if (!sampleSymptom) {
      pushResult('panic_filter_activation', 'skip', 'No symptoms in database')
    } else {
      const triage = computeTriage({
        symptomIds: [String(sampleSymptom.id)],
        severity: 2,
        durationMinutes: 10,
        stressScore: 9,
        sleepHours: 7,
        age: 22,
        hasHypertension: false,
        hasDiabetes: false,
        hasHeartDisease: false,
        hasAsthma: false,
        emergencySensitivity: 0.5,
        panicFilterThreshold: 0.5,
        anxietyTendency: 'low',
        panicAttackHistory: false,
      })
      pushResult(
        'panic_filter_activation',
        triage.panicFilterActivated ? 'pass' : 'fail',
        triage.panicFilterActivated ? undefined : `panicScore=${triage.panicScore}`,
      )
    }

    // ── Exercise selection logic (pure) ───────────────────────
    const exerciseList = selectExercises(['fatigue', 'chest_tightness'], 8, 3)
    pushResult(
      'exercise_assignment_logic',
      exerciseList.length > 0 ? 'pass' : 'fail',
      exerciseList.length > 0 ? exerciseList.join(',') : 'no exercises returned',
    )

    // ── Data integrity checks ─────────────────────────────────
    const missingAssessments = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM sessions s
      LEFT JOIN risk_assessments ra ON ra.session_id = s.id
      WHERE ra.id IS NULL AND s.user_id = ${userId}
    `)
    pushResult(
      'integrity_sessions_have_risk_assessment',
      (missingAssessments.rows?.[0]?.count ?? 0) === 0 ? 'pass' : 'fail',
      `missing=${missingAssessments.rows?.[0]?.count ?? 'unknown'}`,
    )

    const missingVitals = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM sessions s
      LEFT JOIN session_vitals sv ON sv.session_id = s.id
      WHERE sv.id IS NULL AND s.user_id = ${userId}
    `)
    pushResult(
      'integrity_sessions_have_vitals',
      (missingVitals.rows?.[0]?.count ?? 0) === 0 ? 'pass' : 'fail',
      `missing=${missingVitals.rows?.[0]?.count ?? 'unknown'}`,
    )

    const orphanSymptoms = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM session_symptoms ss
      LEFT JOIN sessions s ON s.id = ss.session_id
      WHERE s.id IS NULL
    `)
    pushResult(
      'integrity_no_orphan_session_symptoms',
      (orphanSymptoms.rows?.[0]?.count ?? 0) === 0 ? 'pass' : 'fail',
      `orphaned=${orphanSymptoms.rows?.[0]?.count ?? 'unknown'}`,
    )

    const missingWeights = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM symptoms
      WHERE base_weight IS NULL OR base_weight = 0
    `)
    pushResult(
      'integrity_symptom_weights_present',
      (missingWeights.rows?.[0]?.count ?? 0) === 0 ? 'pass' : 'fail',
      `missing=${missingWeights.rows?.[0]?.count ?? 'unknown'}`,
    )

    const redFlagSlugs = ['arm_jaw_pain', 'facial_droop', 'slurred_speech', 'syncope', 'severe_allergic']
    const badRedFlags = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM symptoms
      WHERE slug = ANY(${redFlagSlugs}) AND is_red_flag = false
    `)
    pushResult(
      'integrity_red_flags_marked',
      (badRedFlags.rows?.[0]?.count ?? 0) === 0 ? 'pass' : 'fail',
      `missing=${badRedFlags.rows?.[0]?.count ?? 'unknown'}`,
    )

    const recentAlerts = await db
      .select({ id: alertLog.id })
      .from(alertLog)
      .where(and(eq(alertLog.userId, userId), gte(alertLog.createdAt, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))))
      .limit(1)
    pushResult(
      'alerts_recent_exists',
      recentAlerts.length > 0 ? 'pass' : 'skip',
      recentAlerts.length > 0 ? 'recent alert found' : 'no recent alerts to validate',
    )

    const historyRows = await db
      .select({ id: riskHistory.id })
      .from(riskHistory)
      .where(eq(riskHistory.userId, userId))
      .limit(1)
    pushResult(
      'risk_history_populated',
      historyRows.length > 0 ? 'pass' : 'skip',
      historyRows.length > 0 ? 'risk history exists' : 'no risk history rows found',
    )

    // ── Feature gaps (not implemented in current schema) ─────
    pushResult(
      'account_deletion_flow',
      'skip',
      'User delete/cancel endpoints currently return 501 (not implemented).',
    )
    pushResult(
      'onboarding_panic_fields',
      'skip',
      'Onboarding schema does not include anxietyTendency/panicAttackHistory yet.',
    )
    pushResult(
      'contact_preference_flags',
      'skip',
      'Emergency contacts do not include notifyOnHighRisk/notifyOnManual flags in current schema.',
    )

    const failed = results.filter((r) => r.status === 'fail')
    res.json({
      ok: failed.length === 0,
      userId,
      checks: results,
      failedCount: failed.length,
    })
  } catch (error: any) {
    console.error('[DEV TEST SUITE] failed:', error)
    res.status(500).json({
      error: 'Test suite failed',
      message: error?.message ?? 'Unknown error',
    })
  }
})

export default router
