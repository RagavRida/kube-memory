import { getCogneeClient } from "../cognee/client.js";

export interface ForgetContext {
  datasetName: string;
}

export interface ForgetInput {
  everything?: boolean;
  datasetName?: string;
}

export async function forgetMemory(
  ctx: ForgetContext,
  input: ForgetInput,
): Promise<{ status: "ok"; datasetName?: string; everything: boolean }> {
  const cognee = getCogneeClient();

  if (input.everything) {
    await cognee.forget({ everything: true });
    return { status: "ok", everything: true };
  }

  const dataset = input.datasetName ?? ctx.datasetName;
  await cognee.forget({ dataset });
  return { status: "ok", datasetName: dataset, everything: false };
}

export async function improveMemory(
  datasetName: string,
  sessionIds?: string[],
): Promise<Record<string, unknown>> {
  const cognee = getCogneeClient();
  return cognee.improve({ datasetName, sessionIds });
}
