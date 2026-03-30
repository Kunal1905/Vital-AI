import { Router } from "express";
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from "../middleware/auth";
import { getOnboarding, saveOnboarding, updateOnboarding } from "../controllers/onBoardingController";

const router = Router();

router.get("/", requireAuthOrTest, getOnboarding);
router.post("/", requireAuthTokenOrTest_DEBUG, saveOnboarding);
router.put("/", requireAuthTokenOrTest_DEBUG, updateOnboarding);

// Backward-compatible aliases
router.get("/getonBoarding", requireAuthOrTest, getOnboarding);
router.post("/saveOnboarding", requireAuthTokenOrTest_DEBUG, saveOnboarding);
router.put("/updateOnboarding", requireAuthTokenOrTest_DEBUG, updateOnboarding);

export default router;
