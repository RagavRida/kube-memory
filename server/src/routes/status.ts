import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { connectMongo, isMongoConfigured } from "../db/connection.js";
import { Connector, connectorTypes } from "../db/models/Connector.js";
import { MemoryEventRecord } from "../db/models/MemoryEventRecord.js";
import { IncidentRecord } from "../db/models/IncidentRecord.js";
import { isCogneeConfigured } from "../services/cognee/client.js";
import { isKubernetesConfigured } from "../services/kubernetes/client.js";

export const statusRouter = Router();

statusRouter.get("/status", authMiddleware, async (req, res, next) => {
  try {
    const workspace = req.kubeAuth!.workspace;
    let memoryEventCount = 0;
    let incidentCount = 0;
    const connectors: Record<
      string,
      { configured: boolean; enabled: boolean; healthStatus: string | null; mcpActive: boolean }
    > = {};

    for (const type of connectorTypes) {
      connectors[type] = {
        configured: false,
        enabled: false,
        healthStatus: null,
        mcpActive: false,
      };
    }

    if (isMongoConfigured()) {
      await connectMongo();
      const docs = await Connector.find({ workspaceId: workspace._id }).lean();
      memoryEventCount = await MemoryEventRecord.countDocuments({ workspaceId: workspace._id });
      incidentCount = await IncidentRecord.countDocuments({ workspaceId: workspace._id });

      for (const doc of docs) {
        const configured = Boolean(doc.secretEncrypted);
        const enabled = Boolean(doc.enabled && doc.secretEncrypted);
        connectors[doc.type] = {
          configured,
          enabled,
          healthStatus: doc.healthStatus ?? null,
          mcpActive: enabled,
        };
      }
    }

    const configuredCount = Object.values(connectors).filter((c) => c.configured).length;
    const enabledCount = Object.values(connectors).filter((c) => c.mcpActive).length;

    res.json({
      workspace: {
        slug: workspace.slug,
        name: workspace.name,
        cogneeDataset: workspace.cogneeDataset,
        retentionDays: workspace.retentionDays,
      },
      integrations: {
        cognee: isCogneeConfigured(),
        kubernetes: isKubernetesConfigured(),
        mongo: isMongoConfigured(),
      },
      connectors,
      stats: {
        connectorsConfigured: configuredCount,
        connectorsEnabled: enabledCount,
        memoryEvents: memoryEventCount,
        incidents: incidentCount,
      },
    });
  } catch (error) {
    next(error);
  }
});
