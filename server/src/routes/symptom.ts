import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createSymptom,
  deleteSymptom,
  getSymptoms,
  updateSymptom,
} from "../controllers/symptoms";

const router = Router();

router.get("/", requireAuth, getSymptoms);
router.post("/", requireAuth, createSymptom);
router.patch("/:id", requireAuth, updateSymptom);
router.delete("/:id", requireAuth, deleteSymptom);

export default router;
