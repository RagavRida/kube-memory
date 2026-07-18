import { Router } from "express";
import { isCogneeConfigured } from "../services/cognee/client.js";
import { isMongoConfigured } from "../db/connection.js";
import { isKubernetesConfigured } from "../services/kubernetes/client.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "kube-memory",
    timestamp: new Date().toISOString(),
  });
});

healthRouter.get("/ready", (_req, res) => {
  const checks = {
    mongo: isMongoConfigured(),
    cognee: isCogneeConfigured(),
    kubernetes: isKubernetesConfigured(),
  };

  const ready = checks.mongo && checks.cognee;
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "degraded", checks });
});
