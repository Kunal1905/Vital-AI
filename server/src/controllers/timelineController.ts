import { Request, Response, NextFunction } from "express";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../config/db";
import { riskAssessments, riskHistory, sessionSymptoms, sessions, symptoms, users } from "../models";

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

function clampDays(raw: string | undefined, fallback: number, max: number) {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
}

export async function getTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const days = clampDays(req.query.days as string | undefined, 30, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sessionRows = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        severity: sessions.severity,
        durationMinutes: sessions.durationMinutes,
        stressScore: sessions.stressScore,
        finalRiskScore: sessions.finalRiskScore,
        finalRiskLevel: sessions.finalRiskLevel,
        riskScore: riskAssessments.riskScore,
        riskLevel: riskAssessments.riskLevel,
      })
      .from(sessions)
      .leftJoin(riskAssessments, eq(riskAssessments.sessionId, sessions.id))
      .where(and(eq(sessions.userId, user.id), gte(sessions.createdAt, since)))
      .orderBy(desc(sessions.createdAt));

    const historyRows = await db
      .select()
      .from(riskHistory)
      .where(and(eq(riskHistory.userId, user.id), gte(riskHistory.createdAt, since)))
      .orderBy(desc(riskHistory.createdAt));

    res.json({
      days,
      sessions: sessionRows,
      analytics: historyRows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTimelineStats(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        createdAt: sessions.createdAt,
        finalRiskScore: sessions.finalRiskScore,
        finalRiskLevel: sessions.finalRiskLevel,
        riskScore: riskAssessments.riskScore,
        riskLevel: riskAssessments.riskLevel,
      })
      .from(sessions)
      .leftJoin(riskAssessments, eq(riskAssessments.sessionId, sessions.id))
      .where(and(eq(sessions.userId, user.id), gte(sessions.createdAt, thirtyDaysAgo)))
      .orderBy(desc(sessions.createdAt));

    if (rows.length === 0) {
      return res.json({ noDataYet: true });
    }

    const scored = rows.map((row) => ({
      createdAt: new Date(row.createdAt),
      score: row.riskScore ?? row.finalRiskScore ?? 0,
    }));

    const last7 = scored.filter((row) => row.createdAt > sevenDaysAgo);
    const last30 = scored;

    const avg = (list: Array<{ score: number }>) =>
      list.length ? list.reduce((sum, item) => sum + item.score, 0) / list.length : 0;

    const latest = rows[0];
    const lastRiskScore = latest.riskScore ?? latest.finalRiskScore ?? 0;
    const lastRiskLevel = latest.riskLevel ?? latest.finalRiskLevel ?? "low";

    res.json({
      noDataYet: false,
      sevenDayAvg: avg(last7),
      thirtyDayAvg: avg(last30),
      lastRiskScore,
      lastRiskLevel,
      totalSessions: rows.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSymptomFrequency(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getDbUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const days = clampDays(req.query.days as string | undefined, 30, 90);
    const limit = Math.min(Number.parseInt((req.query.limit as string) ?? "10", 10) || 10, 25);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        symptomId: symptoms.id,
        name: symptoms.name,
        slug: symptoms.slug,
      })
      .from(sessionSymptoms)
      .leftJoin(sessions, eq(sessionSymptoms.sessionId, sessions.id))
      .leftJoin(symptoms, eq(sessionSymptoms.symptomId, symptoms.id))
      .where(and(eq(sessions.userId, user.id), gte(sessions.createdAt, since)));

    const counts = new Map<number, { symptomId: number; name: string; slug: string; count: number }>();
    rows.forEach((row) => {
      if (!row.symptomId) return;
      const existing = counts.get(row.symptomId);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(row.symptomId, {
          symptomId: row.symptomId,
          name: row.name ?? "",
          slug: row.slug ?? "",
          count: 1,
        });
      }
    });

    const result = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    res.json({ days, count: result.length, data: result });
  } catch (error) {
    next(error);
  }
}
