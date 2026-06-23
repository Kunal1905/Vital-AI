import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getCategories } from "../controllers/symptomCategoriesController";

const router = Router();

router.get("/", requireAuth, getCategories);

export default router;
