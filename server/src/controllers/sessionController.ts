import { NextFunction, Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../config/db";
import {
  calmingSessions,
  panicEvents,
  riskAssessments,
  riskHistory,
  sessionSymptoms,
  sessionVitals,
  sessions,
  symptoms as symptomsTable,
  userOnboarding,
  users,
} from "../models";
import { selectExercises } from "../services/exerciseService";
import { selectBreathingExercise } from "../services/breathingService";
import { detectSymptomsFromText } from "../services/nlpService";
import { getAlertableContacts, triggerFamilyAlert } from "../services/notificationService";
import { computeTriage, loadSymptomWeights } from "../services/triageSrevice";

const createSessionSchema = z.object({
  symptomIds: z.array(z.union([z.string(), z.number()])).default([]),
  freeTextInput: z.string().max(500).optional(),
  severity: z.number().int().min(1).max(10),
  durationMinutes: z.number().int().min(1),
  stressScore: z.number().int().min(1).max(10),
  sleepHours: z.number().min(0).max(24).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  temperatureF: z.number().optional(),
  bloodPressureSystolic: z.number().int().optional(),
  bloodPressureDiastolic: z.number().int().optional(),
  spo2: z.number().int().min(50).max(100).optional(),
  moodScore: z.number().int().min(1).max(5).optional(),
  feeling: z.enum(["good", "okay", "bad"]).optional(),
  offlineSession: z.boolean().optional(),
  clientTimestamp: z.string().datetime().optional(),
});

const syncSessionSchema = z.object({
  sessions: z
    .array(
      z.object({
        symptomIds: z.array(z.union([z.string(), z.number()])).default([]),
        freeTextInput: z.string().max(500).optional(),
        severity: z.number().int().min(1).max(10),
        durationMinutes: z.number().int().min(1),
        stressScore: z.number().int().min(1).max(10),
        sleepHours: z.number().min(0).max(24).optional(),
        heartRate: z.number().int().min(20).max(300).optional(),
        temperatureF: z.number().optional(),
        bloodPressureSystolic: z.number().int().optional(),
        bloodPressureDiastolic: z.number().int().optional(),
        spo2: z.number().int().min(50).max(100).optional(),
        moodScore: z.number().int().min(1).max(5).optional(),
        feeling: z.enum(["good", "okay", "bad"]).optional(),
        clientTimestamp: z.string().datetime(),
      }),
    )
    .min(1, "At least one session required")
    .max(10, "Maximum 10 sessions per sync"),
});

const updateActionSchema = z.object({
  action: z.enum([
    "called_911",
    "went_to_er",
    "went_to_urgent_care",
    "called_doctor",
    "monitored_at_home",
    "ignored",
  ]),
});

const updateCalmingSchema = z.object({
  moduleUsed: z.string().min(1),
  completed: z.boolean(),
  skipped: z.boolean().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

function getAuthUserId(req: Request): string | undefined {
  const authUserId = (req as any).auth?.userId as string | undefined;
  const testUserId = req.headers["x-test-user-id"] as string | undefined;
  return authUserId ?? testUserId;
}

async function getDbUser(req: Request) {
  const authUserId = getAuthUserId(req);
  if (!authUserId) return null;
  const [user] = await db.select().from(users).where(eq(users.clerkUserId, authUserId));
  return user ?? null;
}

function toFeeling(moodScore?: number): "good" | "okay" | "bad" | null {
  if (moodScore === undefined) return null;
  if (moodScore >= 4) return "good";
  if (moodScore === 3) return "okay";
  return "bad";
}

function parseIdParam(idParam: string | string[] | undefined): number {
  const raw = Array.isArray(idParam) ? idParam[0] : idParam;
  return Number.parseInt(raw ?? "", 10);
}

type ProcessSessionResult =
  | { response: {
        sessionId: number;
        triage: {
          score: number;
          level: string;
          confidence: number;
          recommendation: string;
          redFlagsDetected: string[];
          contributingFactors: Record<string, number>;
        };
        panic: {
          activated: boolean;
          score: number;
          emergencyProbability: number;
        };
        exercises: string[];
        familyAlertTriggered: boolean;
        nlpDetected: Array<{ symptomId: string; confidence: number }>;
      } }
  | { error: { status: number; payload: { error: string; code?: string } } };

async function processSessionForUser(
  user: { id: number },
  data: z.infer<typeof createSessionSchema>,
  options?: { offlineSession?: boolean; createdAt?: Date | null; clientTimestamp?: Date | null },
): Promise<ProcessSessionResult> {
  await loadSymptomWeights({
    query: {
      symptoms: {
        findMany: async () =>
          db
            .select({
              id: symptomsTable.id,
              baseWeight: symptomsTable.baseWeight,
              isRedFlag: symptomsTable.isRedFlag,
            })
            .from(symptomsTable),
      },
    },
  });

  let nlpMatches: Array<{ symptomId: string; confidence: number }> = [];
  const nlpConfidence: Record<string, number> = {};

  if (data.freeTextInput?.trim()) {
    const nlp = detectSymptomsFromText(data.freeTextInput);
    nlpMatches = [...nlp.confirmed, ...nlp.uncertain];
    for (const match of nlpMatches) {
      nlpConfidence[match.symptomId] = match.confidence;
    }
  }

  const selectedSymptomIds = data.symptomIds.map((id) => String(id));
  const highConfidenceNlp = nlpMatches
    .filter((m) => m.confidence >= 0.85)
    .map((m) => m.symptomId);
  const allSymptomIdsForTriage = [...new Set([...selectedSymptomIds, ...highConfidenceNlp])];
  const sessionSymptomIds = [...new Set(selectedSymptomIds.map((id) => Number(id)).filter(Number.isFinite))];

  const [baseline] = await db
    .select()
    .from(userOnboarding)
    .where(eq(userOnboarding.userId, user.id));
  if (!baseline) {
    return {
      error: {
        status: 400,
        payload: { error: "Complete your health profile before logging symptoms", code: "ONBOARDING_REQUIRED" },
      },
    };
  }

  const triageResult = computeTriage({
    symptomIds: allSymptomIdsForTriage,
    severity: data.severity,
    durationMinutes: data.durationMinutes,
    stressScore: data.stressScore,
    sleepHours: data.sleepHours ?? baseline.sleepHours ?? 7,
    heartRate: data.heartRate,
    age: baseline.age,
    hasHypertension: baseline.hasHypertension,
    hasDiabetes: baseline.hasDiabetes,
    hasHeartDisease: baseline.hasHeartDisease,
    hasAsthma: baseline.hasAsthma,
    emergencySensitivity: 0.5,
    panicFilterThreshold: 0.5,
    anxietyTendency: "low",
    panicAttackHistory: false,
  });

  const exercises =
    triageResult.triageLevel === "low" || triageResult.triageLevel === "moderate"
      ? selectExercises(allSymptomIdsForTriage, data.stressScore, triageResult.panicScore)
      : [];

  const createdAt = options?.createdAt ?? undefined;
  const clientTimestamp =
    options?.clientTimestamp ??
    (data.clientTimestamp ? new Date(data.clientTimestamp) : null);
  const offlineSession = options?.offlineSession ?? data.offlineSession ?? false;

  const result = await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(sessions)
      .values({
        userId: user.id,
        severity: data.severity,
        durationMinutes: data.durationMinutes,
        stress: data.stressScore,
        stressScore: data.stressScore,
        sleepHours: data.sleepHours ?? null,
        feeling: data.feeling ?? toFeeling(data.moodScore),
        freeTextInput: data.freeTextInput ?? null,
        nlpConfidence: Object.keys(nlpConfidence).length ? nlpConfidence : null,
        panicScore: triageResult.panicScore,
        panicFilterActivated: triageResult.panicFilterActivated,
        offlineSession,
        clientTimestamp,
        createdAt,
        finalRiskScore: triageResult.acuteRiskScore,
        finalRiskLevel: triageResult.triageLevel,
      })
      .returning();

    if (sessionSymptomIds.length > 0) {
      await tx.insert(sessionSymptoms).values(
        sessionSymptomIds.map((symptomId) => ({
          sessionId: session.id,
          symptomId,
        })),
      );
    }

    const [riskAssessment] = await tx
      .insert(riskAssessments)
      .values({
        sessionId: session.id,
        riskScore: triageResult.acuteRiskScore,
        riskLevel: triageResult.triageLevel,
        confidencePercent: triageResult.confidencePct,
        recommendation: triageResult.recommendation,
        contributingFactors: triageResult.contributingFactors,
      })
      .returning();

    await tx.insert(riskHistory).values({
      userId: user.id,
      sessionId: session.id,
      riskScore: triageResult.acuteRiskScore,
      riskLevel: triageResult.triageLevel,
      reason: triageResult.recommendation,
    });

    if (
      data.heartRate !== undefined ||
      data.temperatureF !== undefined ||
      data.bloodPressureSystolic !== undefined ||
      data.bloodPressureDiastolic !== undefined ||
      data.spo2 !== undefined
    ) {
      await tx.insert(sessionVitals).values({
        sessionId: session.id,
        heartRate: data.heartRate ?? null,
        temperatureF: data.temperatureF ?? null,
        bloodPressureSystolic: data.bloodPressureSystolic ?? null,
        bloodPressureDiastolic: data.bloodPressureDiastolic ?? null,
        spo2: data.spo2 ?? null,
      });
    }

    if (triageResult.panicFilterActivated) {
      await tx.insert(panicEvents).values({
        userId: user.id,
        sessionId: session.id,
        triggerSource: "triage",
        status: "active",
      });
    }

    if (exercises.length > 0) {
      await tx.insert(calmingSessions).values(
        exercises.map((exerciseType) => ({
          userId: user.id,
          sessionId: session.id,
          exerciseType,
          durationMinutes: 5,
          completionScore: 0,
          status: "assigned",
        })),
      );
    }

    return { session, riskAssessment };
  });

  const needsFamilyAlert =
    triageResult.triageLevel === "high" ||
    triageResult.triageLevel === "emergency" ||
    triageResult.redFlagsDetected.length > 0;

  if (needsFamilyAlert) {
    const triggerType =
      triageResult.redFlagsDetected.length > 0
        ? "red_flag"
        : triageResult.triageLevel === "high" || triageResult.triageLevel === "emergency"
          ? "high_risk"
          : "manual";

    const contacts = await getAlertableContacts(user.id, triggerType);
    contacts.forEach((contact) => {
      triggerFamilyAlert(
        contact,
        triageResult.triageLevel,
        triageResult.redFlagsDetected,
        result.session.id,
        triageResult.acuteRiskScore,
      ).catch((err) => console.error("Family alert failed:", err));
    });
  }

  return {
    response: {
      sessionId: result.session.id,
      triage: {
        score: triageResult.acuteRiskScore,
        level: triageResult.triageLevel,
        confidence: triageResult.confidencePct,
        recommendation: triageResult.recommendation,
        redFlagsDetected: triageResult.redFlagsDetected,
        contributingFactors: triageResult.contributingFactors,
      },
      panic: {
        activated: triageResult.panicFilterActivated,
        score: triageResult.panicScore,
        emergencyProbability: triageResult.emergencyProbability,
      },
      exercises,
      familyAlertTriggered: needsFamilyAlert,
      nlpDetected: nlpMatches,
    },
  };
}

export async function createSession(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const data = createSessionSchema.parse(req.body);
    const result = await processSessionForUser(user, data, {
      offlineSession: data.offlineSession ?? false,
      clientTimestamp: data.clientTimestamp ? new Date(data.clientTimestamp) : null,
    });
    if ("error" in result) {
      return res.status(result.error.status).json(result.error.payload);
    }
    return res.status(201).json(result.response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    return next(error);
  }
}

export async function getSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const limit = Math.min(Number.parseInt(String(req.query.limit ?? "10"), 10) || 10, 50);
    const userSessions = await db
      .select({
        id: sessions.id,
        severity: sessions.severity,
        stressScore: sessions.stressScore,
        riskScore: riskAssessments.riskScore,
        riskLevel: riskAssessments.riskLevel,
        finalRiskScore: sessions.finalRiskScore,
        finalRiskLevel: sessions.finalRiskLevel,
        durationMinutes: sessions.durationMinutes,
        sleepHours: sessions.sleepHours,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .leftJoin(riskAssessments, eq(sessions.id, riskAssessments.sessionId))
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.createdAt))
      .limit(limit);

    return res.json({ sessions: userSessions });
  } catch (error) {
    return next(error);
  }
}

export async function getSessionById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const sessionId = parseIdParam(req.params.id);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)));

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({ session });
  } catch (error) {
    return next(error);
  }
}

export async function updateSessionAction(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { action } = updateActionSchema.parse(req.body);
    const sessionId = parseIdParam(req.params.id);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const [updated] = await db
      .update(sessions)
      .set({ userActionTaken: action })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    return next(error);
  }
}

export async function syncSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { sessions: offlineSessions } = syncSessionSchema.parse(req.body);

    const results = {
      synced: [] as number[],
      skipped: [] as { index: number; reason: string }[],
      failed: [] as { index: number; error: string }[],
    };

    for (let i = 0; i < offlineSessions.length; i += 1) {
      const sessionData = offlineSessions[i];
      const sessionAgeMs = Date.now() - new Date(sessionData.clientTimestamp).getTime();
      const hoursOld = sessionAgeMs / (1000 * 60 * 60);

      if (hoursOld > 72) {
        let nlpConfidence: Record<string, number> | null = null;
        if (sessionData.freeTextInput?.trim()) {
          const nlp = detectSymptomsFromText(sessionData.freeTextInput);
          const matches = [...nlp.confirmed, ...nlp.uncertain];
          if (matches.length > 0) {
            nlpConfidence = {};
            matches.forEach((match) => {
              nlpConfidence![match.symptomId] = match.confidence;
            });
          }
        }

        const [session] = await db
          .insert(sessions)
          .values({
            userId: user.id,
            severity: sessionData.severity,
            durationMinutes: sessionData.durationMinutes,
            stress: sessionData.stressScore,
            stressScore: sessionData.stressScore,
            sleepHours: sessionData.sleepHours ?? null,
            feeling: sessionData.feeling ?? toFeeling(sessionData.moodScore),
            freeTextInput: sessionData.freeTextInput ?? null,
            nlpConfidence: nlpConfidence ?? null,
            offlineSession: true,
            clientTimestamp: new Date(sessionData.clientTimestamp),
            createdAt: new Date(sessionData.clientTimestamp),
          })
          .returning();

        const sessionSymptomIds = [...new Set(sessionData.symptomIds.map((id) => Number(id)).filter(Number.isFinite))];
        if (sessionSymptomIds.length > 0) {
          await db.insert(sessionSymptoms).values(
            sessionSymptomIds.map((symptomId) => ({
              sessionId: session.id,
              symptomId,
            })),
          );
        }

        if (
          sessionData.heartRate !== undefined ||
          sessionData.temperatureF !== undefined ||
          sessionData.bloodPressureSystolic !== undefined ||
          sessionData.bloodPressureDiastolic !== undefined ||
          sessionData.spo2 !== undefined
        ) {
          await db.insert(sessionVitals).values({
            sessionId: session.id,
            heartRate: sessionData.heartRate ?? null,
            temperatureF: sessionData.temperatureF ?? null,
            bloodPressureSystolic: sessionData.bloodPressureSystolic ?? null,
            bloodPressureDiastolic: sessionData.bloodPressureDiastolic ?? null,
            spo2: sessionData.spo2 ?? null,
          });
        }

        results.skipped.push({
          index: i,
          reason: `Session is ${Math.floor(hoursOld)} hours old — saved without triage`,
        });
        continue;
      }

      try {
        const result = await processSessionForUser(user, sessionData, {
          offlineSession: true,
          createdAt: new Date(sessionData.clientTimestamp),
          clientTimestamp: new Date(sessionData.clientTimestamp),
        });
        if ("error" in result) {
          results.failed.push({ index: i, error: result.error.payload.error ?? "Failed to sync" });
          continue;
        }
        results.synced.push(result.response.sessionId);
      } catch (err: any) {
        results.failed.push({ index: i, error: err?.message ?? "Failed to sync session" });
      }
    }

    return res.json({
      success: true,
      results,
      summary: {
        total: offlineSessions.length,
        synced: results.synced.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    return next(error);
  }
}

export async function updateCalmingSession(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { moduleUsed, completed, skipped, durationSeconds } = updateCalmingSchema.parse(req.body);
    const sessionId = parseIdParam(req.params.id);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const [existing] = await db
      .select()
      .from(calmingSessions)
      .where(
        and(
          eq(calmingSessions.sessionId, sessionId),
          eq(calmingSessions.exerciseType, moduleUsed),
          eq(calmingSessions.userId, user.id),
        ),
      );

    if (!existing) {
      return res.status(404).json({ error: "Calming session not found" });
    }

    const durationMinutes =
      durationSeconds !== undefined
        ? Math.max(1, Math.round(durationSeconds / 60))
        : existing.durationMinutes;

    const status = completed ? "completed" : skipped ? "skipped" : "in_progress";
    const completionScore = completed ? 1 : skipped ? 0 : existing.completionScore;

    await db
      .update(calmingSessions)
      .set({
        durationMinutes,
        completionScore,
        status,
      })
      .where(eq(calmingSessions.id, existing.id));

    return res.json({ success: true, completionScore, status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    return next(error);
  }
}

export async function getCalmingSessionsBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const sessionId = parseIdParam(req.params.id);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const rows = await db
      .select({
        id: calmingSessions.id,
        sessionId: calmingSessions.sessionId,
        exerciseType: calmingSessions.exerciseType,
        durationMinutes: calmingSessions.durationMinutes,
        status: calmingSessions.status,
        createdAt: calmingSessions.createdAt,
      })
      .from(calmingSessions)
      .where(and(eq(calmingSessions.userId, user.id), eq(calmingSessions.sessionId, sessionId)))
      .orderBy(desc(calmingSessions.createdAt));

    return res.json({ sessions: rows });
  } catch (error) {
    return next(error);
  }
}

export async function getBreathingExerciseBySession(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const sessionId = parseIdParam(req.params.id);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const [session] = await db
      .select({
        id: sessions.id,
        stressScore: sessions.stressScore,
        stress: sessions.stress,
        panicScore: sessions.panicScore,
        nlpConfidence: sessions.nlpConfidence,
      })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)));

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const symptomRows = await db
      .select({ slug: symptomsTable.slug })
      .from(sessionSymptoms)
      .leftJoin(symptomsTable, eq(sessionSymptoms.symptomId, symptomsTable.id))
      .where(eq(sessionSymptoms.sessionId, sessionId));

    const symptomSlugs = symptomRows
      .map((row) => row.slug)
      .filter((slug): slug is string => typeof slug === "string");

    const nlpSlugs = session.nlpConfidence
      ? Object.entries(session.nlpConfidence)
          .filter(([, confidence]) => confidence >= 0.85)
          .map(([slug]) => slug)
      : [];

    const uniqueSlugs = [...new Set([...symptomSlugs, ...nlpSlugs])];
    const stressScore = session.stressScore ?? session.stress ?? 5;
    const panicScore = session.panicScore ?? 0;

    const exerciseId = selectBreathingExercise({
      symptomSlugs: uniqueSlugs,
      stressScore,
      panicScore,
    });

    return res.json({ exerciseId, symptomSlugs: uniqueSlugs });
  } catch (error) {
    return next(error);
  }
}
