import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/db";
import { users } from "../models/user";
import { symptomCategories } from "../models";

export const getCategories = async (req: Request, res: Response) => {
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
      return res.status(404).json({
        error: "User not found. Call /submitUser first.",
      });
    }

    const categories = await db
      .select()
      .from(symptomCategories);

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });

  } catch (error) {
    console.error("Error fetching symptom categories:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
