import { Router } from "express";
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from "../middleware/auth";
import {
  createSession,
  getBreathingExerciseBySession,
  getCalmingSessionsBySession,
  getSessionById,
  getSessions,
  syncSessions,
  updateCalmingSession,
  updateSessionAction,
} from "../controllers/sessionController";

const router = Router();

router.post("/", requireAuthTokenOrTest_DEBUG, createSession);
router.get("/", requireAuthOrTest, getSessions);
router.get("/:id", requireAuthOrTest, getSessionById);
router.post("/sync", requireAuthTokenOrTest_DEBUG, syncSessions);
router.get("/:id/calming", requireAuthOrTest, getCalmingSessionsBySession);
router.get("/:id/breathing", requireAuthOrTest, getBreathingExerciseBySession);
router.patch("/:id/action", requireAuthTokenOrTest_DEBUG, updateSessionAction);
router.patch("/:id/calming", requireAuthTokenOrTest_DEBUG, updateCalmingSession);

export default router;
