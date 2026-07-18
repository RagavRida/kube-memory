import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { memoryQueryRequestSchema } from "../schemas/api/memoryQuery.js";
import { recallMemory } from "../services/memory/recall.js";

export const memoryRouter = Router();

memoryRouter.post("/memory/query", authMiddleware, async (req, res, next) => {
  try {
    const body = memoryQueryRequestSchema.parse(req.body);
    const workspace = req.kubeAuth!.workspace;
    const datasetName = body.datasetName ?? workspace.cogneeDataset;

    const result = await recallMemory(
      { datasetName },
      {
        query: body.query,
        topK: body.topK,
        sessionId: body.sessionId,
      },
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
});
