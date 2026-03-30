import { Request, Response } from "express";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "../config/db";
import { users } from "../models/user";
import { symptomCategories, symptoms } from "../models";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const getAuthUser = async (req: Request, res: Response) => {
  const authUser = (req as any).auth?.userId;
  if (!authUser) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, authUser));

  if (!user) {
    res.status(404).json({ error: "User not found. Call /submitUser first." });
    return null;
  }

  return user;
};

export const getSymptoms = async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    if (!user) return;

    const categoryIdParam = req.query.categoryId as string | undefined;
    const categorySlug = req.query.categorySlug as string | undefined;
    const activeParam = req.query.isActive as string | undefined;
    const search = req.query.search as string | undefined;

    let query = db
      .select({
        id: symptoms.id,
        name: symptoms.name,
        slug: symptoms.slug,
        baseWeight: symptoms.baseWeight,
        severityWeight: symptoms.severityWeight,
        isRedFlag: symptoms.isRedFlag,
        isActive: symptoms.isActive,
        categoryId: symptomCategories.id,
        categoryName: symptomCategories.name,
        categorySlug: symptomCategories.slug,
      })
      .from(symptoms)
      .innerJoin(symptomCategories, eq(symptoms.categoryId, symptomCategories.id));

    const filters = [];

    if (categoryIdParam) {
      const categoryId = Number(categoryIdParam);
      if (Number.isNaN(categoryId)) {
        return res.status(400).json({ error: "categoryId must be a number" });
      }
      filters.push(eq(symptoms.categoryId, categoryId));
    }

    if (categorySlug) {
      filters.push(eq(symptomCategories.slug, categorySlug));
    }

    if (activeParam === "true" || activeParam === "false") {
      filters.push(eq(symptoms.isActive, activeParam === "true"));
    }

    if (search) {
      filters.push(ilike(symptoms.name, `%${search}%`));
    }

    const symptomRows =
      filters.length > 0
        ? await query.where(and(...filters))
        : await query;

    return res.status(200).json({
      success: true,
      count: symptomRows.length,
      data: symptomRows,
    });
  } catch (error) {
    console.error("Error fetching symptoms:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createSymptom = async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    if (!user) return;

    const {
      name,
      slug,
      categoryId,
      baseWeight = 1,
      severityWeight = 1,
      isRedFlag = false,
      isActive = true,
    } = req.body ?? {};

    if (!name || !categoryId) {
      return res.status(400).json({ error: "name and categoryId are required" });
    }

    const parsedCategoryId = Number(categoryId);
    if (Number.isNaN(parsedCategoryId)) {
      return res.status(400).json({ error: "categoryId must be a number" });
    }

    const [category] = await db
      .select()
      .from(symptomCategories)
      .where(eq(symptomCategories.id, parsedCategoryId));

    if (!category) {
      return res.status(404).json({ error: "Invalid categoryId" });
    }

    const computedSlug = slug ? toSlug(String(slug)) : toSlug(String(name));

    const [created] = await db
      .insert(symptoms)
      .values({
        name: String(name).trim(),
        slug: computedSlug,
        categoryId: parsedCategoryId,
        baseWeight: Number(baseWeight) || 1,
        severityWeight: Number(severityWeight) || 1,
        isRedFlag: Boolean(isRedFlag),
        isActive: Boolean(isActive),
      })
      .returning();

    return res.status(201).json({
      message: "Symptom created successfully",
      data: created,
    });
  } catch (error: any) {
    console.error("Error creating symptom:", error);
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Symptom slug already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateSymptom = async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    if (!user) return;

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid symptom id" });
    }

    const {
      name,
      slug,
      categoryId,
      baseWeight,
      severityWeight,
      isRedFlag,
      isActive,
    } = req.body ?? {};

    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = String(name).trim();
    if (slug !== undefined) updates.slug = toSlug(String(slug));
    if (categoryId !== undefined) {
      const parsedCategoryId = Number(categoryId);
      if (Number.isNaN(parsedCategoryId)) {
        return res.status(400).json({ error: "categoryId must be a number" });
      }
      const [category] = await db
        .select()
        .from(symptomCategories)
        .where(eq(symptomCategories.id, parsedCategoryId));
      if (!category) {
        return res.status(404).json({ error: "Invalid categoryId" });
      }
      updates.categoryId = parsedCategoryId;
    }
    if (baseWeight !== undefined) updates.baseWeight = Number(baseWeight) || 1;
    if (severityWeight !== undefined) updates.severityWeight = Number(severityWeight) || 1;
    if (isRedFlag !== undefined) updates.isRedFlag = Boolean(isRedFlag);
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    const [updated] = await db
      .update(symptoms)
      .set(updates as any)
      .where(eq(symptoms.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Symptom not found" });
    }

    return res.status(200).json({
      message: "Symptom updated successfully",
      data: updated,
    });
  } catch (error: any) {
    console.error("Error updating symptom:", error);
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Symptom slug already exists" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteSymptom = async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req, res);
    if (!user) return;

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid symptom id" });
    }

    const [updated] = await db
      .update(symptoms)
      .set({ isActive: false })
      .where(eq(symptoms.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Symptom not found" });
    }

    return res.status(200).json({
      message: "Symptom deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error deleting symptom:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
