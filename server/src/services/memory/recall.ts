import { getCogneeClient } from "../cognee/client.js";

export interface RecallContext {
  datasetName: string;
}

export interface RecallInput {
  query: string;
  topK?: number;
  sessionId?: string;
}

export interface RecallMatch {
  source?: string;
  text: string;
  raw: unknown;
}

export interface RecallResult {
  query: string;
  matches: RecallMatch[];
  datasetName: string;
}

function extractText(entry: unknown): string {
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const obj = entry as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.content === "string") return obj.content;
    if (obj.result && typeof obj.result === "object") {
      const result = obj.result as Record<string, unknown>;
      if (typeof result.data === "string") return result.data;
      if (Array.isArray(result.data)) {
        return result.data.map(String).join("\n");
      }
    }
    if (obj.data && typeof obj.data === "string") return obj.data;
  }
  return JSON.stringify(entry);
}

export async function recallMemory(
  ctx: RecallContext,
  input: RecallInput,
): Promise<RecallResult> {
  const cognee = getCogneeClient();
  const results = await cognee.recall(input.query, {
    datasets: [ctx.datasetName],
    topK: input.topK ?? 10,
    sessionId: input.sessionId,
  });

  const matches: RecallMatch[] = (Array.isArray(results) ? results : [results]).map(
    (entry) => {
      const obj = entry as Record<string, unknown>;
      return {
        source: typeof obj.source === "string" ? obj.source : undefined,
        text: extractText(entry),
        raw: entry,
      };
    },
  );

  return {
    query: input.query,
    matches,
    datasetName: ctx.datasetName,
  };
}

export function scoreRecallSimilarity(matches: RecallMatch[]): number {
  if (matches.length === 0) return 0;
  const graphMatches = matches.filter((m) => m.source === "graph" || !m.source).length;
  const sessionMatches = matches.filter((m) => m.source === "session").length;
  const base = Math.min(matches.length / 5, 1);
  const sourceBoost = graphMatches > 0 ? 0.2 : sessionMatches > 0 ? 0.1 : 0;
  return Math.min(base + sourceBoost, 1);
}
