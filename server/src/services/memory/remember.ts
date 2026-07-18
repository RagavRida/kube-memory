import type { Types } from "mongoose";
import {
  memoryEpisodeSchema,
  serializeEpisodeForCognee,
  type MemoryEpisode,
} from "../../schemas/graph/index.js";
import { MemoryEventRecord } from "../../db/models/MemoryEventRecord.js";
import { classifyFailure } from "../classification/heuristics.js";
import { getCogneeClient, isCogneeConfigured } from "../cognee/client.js";

export interface RememberContext {
  workspaceId: Types.ObjectId;
  datasetName: string;
}

export interface RememberInput {
  episode?: MemoryEpisode;
  text?: string;
  logText?: string;
}

export interface RememberResult {
  status: "accepted";
  recordId: string;
  failureCategory?: string;
  datasetName: string;
  indexingStatus?: "indexed" | "pending" | "failed";
}

export async function rememberMemory(
  ctx: RememberContext,
  input: RememberInput,
): Promise<RememberResult> {
  let episode: MemoryEpisode;

  if (input.episode) {
    episode = memoryEpisodeSchema.parse(input.episode);
  } else if (input.text) {
    const classification = classifyFailure(input.text);
    episode = memoryEpisodeSchema.parse({
      entity: "Incident",
      service: { name: "unknown", criticality: "medium" },
      incident: { time: new Date().toISOString(), status: "open" },
      rootCause: {
        category: classification.category,
        description: input.text.slice(0, 2000),
      },
      rawText: input.text,
    });
  } else {
    throw new Error("Either episode or text is required");
  }

  if (input.logText) {
    const classification = classifyFailure(input.logText);
    episode = {
      ...episode,
      rootCause: episode.rootCause ?? {
        category: classification.category,
        description: classification.matchedPattern ?? input.logText.slice(0, 500),
      },
    };
  }

  const failureCategory = episode.rootCause?.category;
  const payload = episode as unknown as Record<string, unknown>;

  const record = await MemoryEventRecord.create({
    workspaceId: ctx.workspaceId,
    cogneeDataset: ctx.datasetName,
    payload,
    status: "pending",
    failureCategory,
  });

  if (!isCogneeConfigured()) {
    record.errorMessage = "Cognee indexing pending — COGNEE_API_KEY not configured";
    await record.save();
    return {
      status: "accepted",
      recordId: record._id.toString(),
      failureCategory,
      datasetName: ctx.datasetName,
      indexingStatus: "pending",
    };
  }

  try {
    const cognee = getCogneeClient();
    const result = await cognee.remember(serializeEpisodeForCognee(episode), {
      datasetName: ctx.datasetName,
      runInBackground: true,
    });

    record.status = "indexed";
    if (typeof result === "object" && result !== null && "data_id" in result) {
      record.cogneeDataId = String((result as { data_id?: string }).data_id);
    }
    await record.save();
  } catch (error) {
    record.status = "failed";
    record.errorMessage = error instanceof Error ? error.message : "Unknown error";
    await record.save();
    return {
      status: "accepted",
      recordId: record._id.toString(),
      failureCategory,
      datasetName: ctx.datasetName,
      indexingStatus: "failed",
    };
  }

  return {
    status: "accepted",
    recordId: record._id.toString(),
    failureCategory,
    datasetName: ctx.datasetName,
    indexingStatus: "indexed",
  };
}
