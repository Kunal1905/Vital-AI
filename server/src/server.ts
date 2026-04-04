import dotenv from "dotenv";
import app from "./app";
import userRoutes from "./routes/user";
import onBoardingRoutes from "./routes/onBoarding";
import symptomRoutes from "./routes/symptom";
import symptomCategoriesRoutes from "./routes/symptomCategories";
import sessionRoutes from "./routes/session";
import riskAssessmentRoutes from "./routes/riskAssessment";
import panicEventRoutes from "./routes/panicEvent";
import calmingSessionRoutes from "./routes/calmingSession";
import riskHistoryRoutes from "./routes/riskHistory";
import ContactRoutes from "./routes/contacts";
import alertLogRoutes from "./routes/alertLog";
import familyAlertLogRoutes from "./routes/familyAlertLog";
import alertsRoutes from "./routes/alerts.routes";
import timelineRoutes from "./routes/timeline";
import { startJobs } from "./jobs";
import { loadSymptomWeights } from "./services/triageSrevice";
import { db } from "./config/db";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const PORT = process.env.PORT || 3005;

console.log("CLERK_SECRET_KEY:", !!process.env.CLERK_SECRET_KEY);
console.log("CLERK_PUBLISHABLE_KEY:", !!process.env.CLERK_PUBLISHABLE_KEY);
console.log("DATABASE_URL:", !!process.env.DATABASE_URL);

app.use("/api/users", userRoutes);
app.use("/api/onboarding", onBoardingRoutes);
app.use("/api/users/onboarding", onBoardingRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/symptom-categories", symptomCategoriesRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/risk-assessments", riskAssessmentRoutes);
app.use("/api/panic-events", panicEventRoutes);
app.use("/api/calming-sessions", calmingSessionRoutes);
app.use("/api/risk-history", riskHistoryRoutes);
app.use("/api/contacts", ContactRoutes);
app.use("/api/alert-log", alertLogRoutes);
app.use("/api/family-alert-log", familyAlertLogRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/timeline", timelineRoutes);
app.use("/api/categories", symptomCategoriesRoutes);

const shouldEnableDevRoutes =
  process.env.NODE_ENV === "development" || process.env.DEV_ROUTES_ENABLED === "true";

if (shouldEnableDevRoutes) {
  import("./routes/dev.routes").then((mod) => {
    app.use("/dev", mod.default);
    console.log("[DEV] /dev routes enabled");
  });
}

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await loadSymptomWeights(db);
  startJobs();
});
