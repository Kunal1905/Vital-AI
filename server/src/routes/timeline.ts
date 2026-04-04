import { Router } from "express";
import { requireAuthOrTest } from "../middleware/auth";
import {
  getTimeline,
  getTimelineStats,
  getSymptomFrequency,
} from "../controllers/timelineController";

const router = Router();

router.get("/", requireAuthOrTest, getTimeline);
router.get("/stats", requireAuthOrTest, getTimelineStats);
router.get("/frequency", requireAuthOrTest, getSymptomFrequency);

export default router;
