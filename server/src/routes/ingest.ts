import { Router } from "express";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";
import { ingestRequestSchema } from "../schemas/api/ingest.js";
import { classifyFailure } from "../services/classification/heuristics.js";
import { rememberMemory } from "../services/memory/remember.js";

export const ingestRouter = Router();

ingestRouter.post("/ingest", authMiddleware, requireAdmin, async (req, res, next) => {
  try {
    const body = ingestRequestSchema.parse(req.body);
    const workspace = req.kubeAuth!.workspace;
    const datasetName = body.datasetName ?? workspace.cogneeDataset;

    let episode = body.episode;
    if (body.classifyFromLogs && body.logText) {
      const classification = classifyFailure(body.logText);
      episode = {
        ...episode,
        rootCause: episode.rootCause ?? {
          category: classification.category,
          description: classification.matchedPattern ?? body.logText.slice(0, 500),
        },
        errorLogSnippet: {
          snippet: body.logText.slice(0, 4000),
        },
      };
    }

    const result = await rememberMemory(
      { workspaceId: workspace._id, datasetName },
      { episode, logText: body.logText },
    );

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});
