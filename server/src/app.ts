import express from "express";
import cors from "cors";
import morgan from "morgan";
import { clerkMiddleware } from "@clerk/express";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.CLIENT_URL,
]);

console.log("CORS allowed origins:", Array.from(allowedOrigins));

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
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
