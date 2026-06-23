import dotenv from "dotenv";
import { startJobs } from "./jobs";
import { loadSymptomWeights } from "./services/triageSrevice";
import { db } from "./config/db";

dotenv.config();

(async () => {
  await loadSymptomWeights(db);
  startJobs();
  console.log("Worker process started - running cron jobs only");
}) ();