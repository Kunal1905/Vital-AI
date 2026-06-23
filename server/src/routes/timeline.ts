import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getTimeline,
  getTimelineStats,
  getSymptomFrequency,
} from "../controllers/timelineController";

const router = Router();

router.get("/", requireAuth, getTimeline);
router.get("/stats", requireAuth, getTimelineStats);
router.get("/frequency", requireAuth, getSymptomFrequency);

export default router;
