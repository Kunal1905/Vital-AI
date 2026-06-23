import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getFamilyAlertLogEntries } from "../controllers/logController";

const router = Router();

router.get("/", requireAuth, getFamilyAlertLogEntries);

export default router;
