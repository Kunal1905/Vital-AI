import { NextFunction, Request, Response } from "express";
import Sentry from "@sentry/node";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const status = err?.statusCode || err?.status || 500;

  console.error("Unhandled error:", {
    message: err?.message,
    status,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });

  if(status >= 500) {
    Sentry.captureException(err);
  }

  res.status(status).json({
    error: err?.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err?.stack }),
  });
}
