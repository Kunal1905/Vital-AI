import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { userOnboarding } from "../models/userOnboarding";
import { users } from "../models/user";

const standardProfile = {
  age: 20,
  sex: "unspecified",
  heightCm: 170,
  weightKg: 70,
  activityLevel: "moderate",
  conditions: "",
  medications: "",
  allergies: "",
  sleepHours: 8,
  stressLevel: 5,
  emergencyName: "Not provided",
  emergencyPhone: "Not provided",
  baselineHr: 72,
  baselineBp: "120/80",
  hasHypertension: false,
  hasDiabetes: false,
  hasHeartDisease: false,
  hasAsthma: false,
  hasThyroidDisorder: false,
};

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export const getOnboarding = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, authUser));

    if (!user) {
      return res.status(404).json({ error: "User not found. Call /submitUser first." });
    }

    const [profile] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, user.id));

    return res.status(200).json({
      exists: Boolean(profile),
      onboarding: profile ?? standardProfile,
    });
  } catch (error) {
    console.error("Error fetching onboarding:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const saveOnboarding = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, authUser));

    if (!user) {
      return res.status(404).json({ error: "User not found. Call /submitUser first." });
    }

    const payload = removeUndefined({
      age: toOptionalNumber(req.body.age),
      sex: toOptionalString(req.body.sex),
      heightCm: toOptionalNumber(req.body.heightCm),
      weightKg: toOptionalNumber(req.body.weightKg),
      activityLevel: toOptionalString(req.body.activityLevel),
      conditions: toOptionalString(req.body.conditions),
      medications: toOptionalString(req.body.medications),
      allergies: toOptionalString(req.body.allergies),
      sleepHours: toOptionalNumber(req.body.sleepHours),
      stressLevel: toOptionalNumber(req.body.stressLevel),
      emergencyName: toOptionalString(req.body.emergencyName),
      emergencyPhone: toOptionalString(req.body.emergencyPhone),
      baselineHr: toOptionalNumber(req.body.baselineHr),
      baselineBp: toOptionalString(req.body.baselineBp),
      hasHypertension: toOptionalBoolean(req.body.hasHypertension),
      hasDiabetes: toOptionalBoolean(req.body.hasDiabetes),
      hasHeartDisease: toOptionalBoolean(req.body.hasHeartDisease),
      hasAsthma: toOptionalBoolean(req.body.hasAsthma),
      hasThyroidDisorder: toOptionalBoolean(req.body.hasThyroidDisorder),
    });

    const [existing] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, user.id));

    if (existing) {
      const [updated] = await db
        .update(userOnboarding)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(userOnboarding.userId, user.id))
        .returning();

      await db
        .update(users)
        .set({ onboardingCompleted: true })
        .where(eq(users.id, user.id));

      return res.status(200).json({
        message: "Onboarding updated successfully",
        onboarding: updated,
      });
    }

    const [created] = await db
      .insert(userOnboarding)
      .values({
        userId: user.id,
        ...payload,
      })
      .returning();

    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      message: "Onboarding saved successfully",
      onboarding: created,
    });
  } catch (error) {
    console.error("Error saving onboarding:", error);
    return res.status(400).json({ error: "Invalid onboarding payload" });
  }
};

export const updateOnboarding = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, authUser));

    if (!user) {
      return res.status(404).json({ error: "User not found. Call /submitUser first." });
    }

    const payload = removeUndefined({
      age: toOptionalNumber(req.body.age),
      sex: toOptionalString(req.body.sex),
      heightCm: toOptionalNumber(req.body.heightCm),
      weightKg: toOptionalNumber(req.body.weightKg),
      activityLevel: toOptionalString(req.body.activityLevel),
      conditions: toOptionalString(req.body.conditions),
      medications: toOptionalString(req.body.medications),
      allergies: toOptionalString(req.body.allergies),
      sleepHours: toOptionalNumber(req.body.sleepHours),
      stressLevel: toOptionalNumber(req.body.stressLevel),
      emergencyName: toOptionalString(req.body.emergencyName),
      emergencyPhone: toOptionalString(req.body.emergencyPhone),
      baselineHr: toOptionalNumber(req.body.baselineHr),
      baselineBp: toOptionalString(req.body.baselineBp),
      hasHypertension: toOptionalBoolean(req.body.hasHypertension),
      hasDiabetes: toOptionalBoolean(req.body.hasDiabetes),
      hasHeartDisease: toOptionalBoolean(req.body.hasHeartDisease),
      hasAsthma: toOptionalBoolean(req.body.hasAsthma),
      hasThyroidDisorder: toOptionalBoolean(req.body.hasThyroidDisorder),
    });

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [existing] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, user.id));

    if (!existing) {
      return res.status(404).json({
        error: "No health profile found. Complete onboarding first.",
        code: "ONBOARDING_NOT_FOUND",
      });
    }

    const [updated] = await db
      .update(userOnboarding)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(userOnboarding.userId, user.id))
      .returning();

    return res.status(200).json({
      message: "Onboarding updated successfully",
      onboarding: updated,
    });
  } catch (error) {
    console.error("Error updating onboarding:", error);
    return res.status(400).json({ error: "Invalid onboarding payload" });
  }
};
