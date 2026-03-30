import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, route: "family-alert-log", message: "Route wired. Implement worker handlers next." });
});

export default router;
