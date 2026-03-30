import { Router } from "express";
import { requireAuthOrTest } from "../middleware/auth";
import { getCategories } from "../controllers/symptomCategoriesController";

const router = Router();

router.get("/", requireAuthOrTest, getCategories);

export default router;
