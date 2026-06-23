import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getOnboarding, saveOnboarding, updateOnboarding } from "../controllers/onBoardingController";

const router = Router();

router.get("/", requireAuth, getOnboarding);
router.post("/", requireAuth, saveOnboarding);
router.put("/", requireAuth, updateOnboarding);

// Backward-compatible aliases
router.get("/getonBoarding", requireAuth, getOnboarding);
router.post("/saveOnboarding", requireAuth, saveOnboarding);
router.put("/updateOnboarding", requireAuth, updateOnboarding);

export default router;
