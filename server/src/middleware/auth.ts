import { getAuth } from "@clerk/express";
import { verifyToken } from "@clerk/backend";
import { Request, Response, NextFunction } from "express";

// Strict auth (real users only)
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const auth = getAuth(req);

  if (!auth.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  (req as any).auth = auth;
  next();
};

// For backward compatibility, alias the test middleware to requireAuth
export const requireAuthTokenOrTest_DEBUG = requireAuth;
export const requireAuthOrTest = requireAuth;
