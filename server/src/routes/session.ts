import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSession,
  getBreathingExerciseBySession,
  getCalmingSessionsBySession,
  getCalmingRecommendation,
  getSessionById,
  getSessions,
  syncSessions,
  updateCalmingSession,
  updateSessionAction,
} from "../controllers/sessionController";

const router = Router();

router.post("/", requireAuth, createSession);
router.get("/", requireAuth, getSessions);
router.get("/:id", requireAuth, getSessionById);
router.post("/sync", requireAuth, syncSessions);
router.get("/:id/calming", requireAuth, getCalmingSessionsBySession);
router.get("/:id/breathing", requireAuth, getBreathingExerciseBySession);
router.patch("/:id/action", requireAuth, updateSessionAction);
router.patch("/:id/calming", requireAuth, updateCalmingSession);

export default router;
