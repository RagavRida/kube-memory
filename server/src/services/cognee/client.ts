import { getEnv, requireCogneeApiKey } from "../../config/env.js";

export interface CogneeRememberOptions {
  datasetName: string;
  runInBackground?: boolean;
}

export interface CogneeRecallOptions {
  datasets?: string[];
  topK?: number;
  sessionId?: string;
}

export interface CogneeForgetOptions {
  dataset?: string;
  everything?: boolean;
}

export interface CogneeImproveOptions {
  datasetName: string;
  sessionIds?: string[];
}

export class CogneeCloudClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly tenantId?: string;

  constructor(baseUrl?: string, apiKey?: string, tenantId?: string) {
    const env = getEnv();
    this.baseUrl = (baseUrl ?? env.COGNEE_BASE_URL).replace(/\/$/, "");
    this.apiKey = apiKey ?? requireCogneeApiKey();
    this.tenantId = tenantId ?? env.COGNEE_TENANT_ID;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { body?: FormData | string | null } = {},
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("X-Api-Key", this.apiKey);
    if (this.tenantId) {
      headers.set("X-Tenant-Id", this.tenantId);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Cognee API error ${response.status}: ${body.slice(0, 500)}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  async health(): Promise<{ status?: string }> {
    return this.request("/health", { method: "GET" });
  }

  async remember(text: string, options: CogneeRememberOptions): Promise<Record<string, unknown>> {
    const form = new FormData();
    form.append("data", new Blob([text], { type: "text/plain" }), "memory.txt");
    form.append("datasetName", options.datasetName);
    form.append("run_in_background", String(options.runInBackground ?? true));

    return this.request("/api/v1/remember", {
      method: "POST",
      body: form,
    });
  }

  async recall(
    query: string,
    options: CogneeRecallOptions = {},
  ): Promise<unknown[]> {
    return this.request<unknown[]>("/api/v1/recall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        datasets: options.datasets,
        topK: options.topK ?? 10,
        sessionId: options.sessionId,
      }),
    });
  }

  async forget(options: CogneeForgetOptions): Promise<Record<string, unknown>> {
    return this.request("/api/v1/forget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset: options.dataset,
        everything: options.everything ?? false,
      }),
    });
  }

  async improve(options: CogneeImproveOptions): Promise<Record<string, unknown>> {
    return this.request("/api/v1/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataset_name: options.datasetName,
        session_ids: options.sessionIds,
      }),
    });
  }
}

let client: CogneeCloudClient | null = null;

export function getCogneeClient(): CogneeCloudClient {
  if (!client) {
    client = new CogneeCloudClient();
  }
  return client;
}

export function isCogneeConfigured(): boolean {
  return Boolean(getEnv().COGNEE_API_KEY);
}
