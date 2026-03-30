import { Router } from "express";
import { requireAuthOrTest, requireAuthTokenOrTest_DEBUG } from "../middleware/auth";
import {
  createSymptom,
  deleteSymptom,
  getSymptoms,
  updateSymptom,
} from "../controllers/symptoms";

const router = Router();

router.get("/", requireAuthOrTest, getSymptoms);
router.post("/", requireAuthTokenOrTest_DEBUG, createSymptom);
router.patch("/:id", requireAuthTokenOrTest_DEBUG, updateSymptom);
router.delete("/:id", requireAuthTokenOrTest_DEBUG, deleteSymptom);

export default router;
