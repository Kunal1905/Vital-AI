import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { users } from "../models/user";
import { userOnboarding } from "../models/userOnboarding";
import { db } from "../config/db";
import { z } from "zod";

function getAuthUserId(req: Request): string | undefined {
  const authUserId = (req as any).auth?.userId as string | undefined;
  const testUserId = req.headers["x-test-user-id"] as string | undefined;
  return authUserId ?? testUserId;
}

// Get current user data + onboarding profile (with defaults fallback)
export const getUser = async (req: Request, res: Response) => {
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
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/users/me
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUserId(req);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, authUser));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const [profile] = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.userId, user.id));

    return res.json({
      user,
      profile: profile ?? null,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/me
export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUserId(req);
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const schema = z
      .object({
        email: z.string().email().optional(),
      })
      .strict();

    const data = schema.parse(req.body);
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.clerkUserId, authUser))
      .returning();

    return res.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.issues });
    }
    next(error);
  }
};

// DELETE /api/users/me
export const deleteMe = async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: "Account deletion is not configured for this project yet.",
  });
};

// POST /api/users/me/cancel-deletion
export const cancelDeletion = async (_req: Request, res: Response) => {
  return res.status(501).json({
    error: "Account deletion cancellation is not configured for this project yet.",
  });
};

// Create user on first login
export const submitUser = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).auth?.userId;
    if (!authUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, authUser));

    if (existingUser) {
      return res.status(200).json({
        message: "User already exists",
        user: existingUser,
      });
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId: authUser,
        email,
      })
      .returning();

    return res.status(200).json({
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Error submit data:", error);
    return res.status(400).json({ error: "User details not filled correctly" });
  }
};
