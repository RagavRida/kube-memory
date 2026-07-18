import { Router } from "express";
import { ApiKey } from "../db/models/ApiKey.js";
import { createApiKeySchema } from "../schemas/api/apiKeys.js";
import { sessionAuthMiddleware, requireSessionAdmin } from "../middleware/sessionAuth.js";
import { hashApiKey } from "../middleware/auth.js";
import { generateApiKeyRaw } from "../utils/crypto.js";

export const apiKeysRouter = Router();

apiKeysRouter.get("/api-keys", sessionAuthMiddleware, async (req, res, next) => {
  try {
    const workspaceId = req.session!.workspace._id;
    const keys = await ApiKey.find({ workspaceId })
      .select("prefix role label createdAt lastUsedAt expiresAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      keys: keys.map((k) => ({
        id: k._id.toString(),
        prefix: k.prefix,
        role: k.role,
        label: k.label,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

apiKeysRouter.post(
  "/api-keys",
  sessionAuthMiddleware,
  requireSessionAdmin,
  async (req, res, next) => {
    try {
      const body = createApiKeySchema.parse(req.body);
      const workspaceId = req.session!.workspace._id;
      const rawKey = generateApiKeyRaw();
      const prefix = rawKey.slice(0, 8);

      const record = await ApiKey.create({
        workspaceId,
        keyHash: hashApiKey(rawKey),
        prefix,
        role: body.role,
        label: body.label,
      });

      res.status(201).json({
        id: record._id.toString(),
        key: rawKey,
        prefix,
        role: record.role,
        label: record.label,
      });
    } catch (error) {
      next(error);
    }
  },
);

apiKeysRouter.delete(
  "/api-keys/:id",
  sessionAuthMiddleware,
  requireSessionAdmin,
  async (req, res, next) => {
    try {
      const workspaceId = req.session!.workspace._id;
      const result = await ApiKey.deleteOne({
        _id: req.params.id,
        workspaceId,
      });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: "API key not found" });
        return;
      }

      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  },
);
