import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, route: "emergency-contacts", message: "Route wired. Implement CRUD next." });
});

export default router;
