import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getAlertLogEntries } from "../controllers/logController";

const router = Router();

router.get("/", requireAuth, getAlertLogEntries);

export default router;
