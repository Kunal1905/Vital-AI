import express from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";

const app = express();

const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_URL ? `http://${process.env.VERCEL_URL}` : undefined,
];

const extraAllowlist = process.env.CORS_ALLOWLIST
  ? process.env.CORS_ALLOWLIST.split(",").map((entry) => entry.trim())
  : [];

const allowedOrigins = new Set(
  [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://vital-ai-three.vercel.app",
    ...envOrigins,
    ...extraAllowlist,
  ].filter(Boolean),
);


console.log("CORS allowed origins:", Array.from(allowedOrigins));

const corsOptions: CorsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow non-browser clients (curl/postman) and configured frontend origins
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(clerkMiddleware());

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "vital-api",
    message: "Backend is running. Use /api/* endpoints.",
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

export default app;
