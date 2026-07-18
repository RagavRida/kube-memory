import { Router } from "express";
import { getEnv } from "../config/env.js";
import { improveMemory } from "../services/memory/forget.js";

export const cronRouter = Router();

cronRouter.get("/api/cron/improve", async (req, res, next) => {
  try {
    const cronSecret = getEnv().CRON_SECRET;
    if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const datasetName =
      typeof req.query.dataset === "string" ? req.query.dataset : "main_dataset";

    const result = await improveMemory(datasetName);
    res.json({ status: "ok", datasetName, result });
  } catch (error) {
    next(error);
  }
});
