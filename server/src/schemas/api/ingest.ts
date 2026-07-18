import { z } from "zod";
import { memoryEpisodeSchema } from "../graph/index.js";

export const ingestRequestSchema = z.object({
  episode: memoryEpisodeSchema,
  datasetName: z.string().min(1).optional(),
  classifyFromLogs: z.boolean().default(false),
  logText: z.string().optional(),
});

export type IngestRequest = z.infer<typeof ingestRequestSchema>;

export const memoryQueryRequestSchema = z.object({
  query: z.string().min(1),
  datasetName: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  sessionId: z.string().optional(),
});

export type MemoryQueryRequest = z.infer<typeof memoryQueryRequestSchema>;
