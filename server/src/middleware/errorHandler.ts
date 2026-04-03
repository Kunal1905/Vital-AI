import { NextFunction, Request, Response } from "express";

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

  res.status(status).json({
    error: err?.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err?.stack }),
  });
}
