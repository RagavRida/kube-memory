import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  memoryForgetInputSchema,
  memoryRecallInputSchema,
  memoryRememberInputSchema,
  predictRiskInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import { forgetMemory } from "../../services/memory/forget.js";
import { recallMemory, scoreRecallSimilarity } from "../../services/memory/recall.js";
import { rememberMemory } from "../../services/memory/remember.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerMemoryTools(server: McpServer): void {
  server.registerTool(
    "memory_remember",
    {
      title: "Remember DevOps Event",
      description: "Store a deployment, incident, or fix as structured memory in Cognee.",
      inputSchema: {
        episode: z.record(z.string(), z.unknown()).optional(),
        text: z.string().optional(),
        datasetName: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const input = memoryRememberInputSchema.parse(args);
      const datasetName = input.datasetName ?? auth.workspace.cogneeDataset;

      const result = await rememberMemory(
        { workspaceId: auth.workspace._id, datasetName },
        { episode: input.episode, text: input.text },
      );

      return textContent(result);
    },
  );

  server.registerTool(
    "memory_recall",
    {
      title: "Recall DevOps Memory",
      description: "Query past incidents, fixes, and deployments by similarity.",
      inputSchema: {
        query: z.string(),
        datasetName: z.string().optional(),
        topK: z.number().int().min(1).max(100).optional(),
        sessionId: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const input = memoryRecallInputSchema.parse(args);
      const datasetName = input.datasetName ?? auth.workspace.cogneeDataset;

      const result = await recallMemory(
        { datasetName },
        {
          query: input.query,
          topK: input.topK,
          sessionId: input.sessionId,
        },
      );

      return textContent(result);
    },
  );

  server.registerTool(
    "memory_forget",
    {
      title: "Forget Memory",
      description: "Remove stale or sensitive memory from a dataset.",
      inputSchema: {
        datasetName: z.string().optional(),
        everything: z.boolean().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }

      const input = memoryForgetInputSchema.parse(args);
      const result = await forgetMemory({ datasetName: auth.workspace.cogneeDataset }, input);
      return textContent(result);
    },
  );

  server.registerTool(
    "predict_risk",
    {
      title: "Predict Deployment Risk",
      description: "Score planned deployment risk using recall similarity over past failures.",
      inputSchema: {
        serviceName: z.string(),
        query: z.string().optional(),
        datasetName: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const input = predictRiskInputSchema.parse(args);
      const datasetName = input.datasetName ?? auth.workspace.cogneeDataset;
      const query =
        input.query ??
        `Past failures, incidents, or outages for service ${input.serviceName}`;

      const recall = await recallMemory({ datasetName }, { query, topK: 5 });
      const score = scoreRecallSimilarity(recall.matches);
      const reason =
        score >= 0.6
          ? `Found ${recall.matches.length} similar past events for ${input.serviceName}.`
          : score >= 0.3
            ? `Some related history found for ${input.serviceName}; review before deploying.`
            : `No strong matches in memory for ${input.serviceName}.`;

      return textContent({ score, reason, matchCount: recall.matches.length });
    },
  );
}
