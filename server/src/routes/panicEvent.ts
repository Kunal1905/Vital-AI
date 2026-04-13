import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, route: "panic-events", message: "Route wired. Implement worker handlers next." });
});

export default router;
