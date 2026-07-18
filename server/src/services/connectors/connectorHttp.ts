import { getConnectorSecret } from "./connectorSecrets.js";
import type { ConnectorType } from "../../db/models/Connector.js";

export class ConnectorNotConfiguredError extends Error {
  constructor(type: ConnectorType) {
    super(`${type} connector not configured. Connect it in the dashboard and enable it.`);
    this.name = "ConnectorNotConfiguredError";
  }
}

export async function requireConnector(
  workspaceId: string,
  type: ConnectorType,
): Promise<{ config: Record<string, unknown>; secret: string }> {
  const connector = await getConnectorSecret(workspaceId, type);
  if (!connector?.secret) {
    throw new ConnectorNotConfiguredError(type);
  }
  return { config: connector.config, secret: connector.secret };
}

export async function connectorFetch(
  workspaceId: string,
  type: ConnectorType,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const { secret } = await requireConnector(workspaceId, type);
  const headers = new Headers(init.headers);

  switch (type) {
    case "github":
      headers.set("Authorization", `Bearer ${secret}`);
      headers.set("Accept", "application/vnd.github+json");
      headers.set("X-GitHub-Api-Version", "2022-11-28");
      break;
    case "slack":
      headers.set("Authorization", `Bearer ${secret}`);
      break;
    case "pagerduty":
      headers.set("Authorization", `Token token=${secret}`);
      headers.set("Accept", "application/vnd.pagerduty+json;version=2");
      break;
    case "prometheus":
    case "argocd":
      if (secret) headers.set("Authorization", `Bearer ${secret}`);
      break;
    case "linear":
      headers.set("Authorization", secret);
      break;
    case "notion":
      headers.set("Authorization", `Bearer ${secret}`);
      headers.set("Notion-Version", "2022-06-28");
      break;
    default:
      break;
  }

  return fetch(url, { ...init, headers });
}

export async function connectorJson<T>(
  workspaceId: string,
  type: ConnectorType,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await connectorFetch(workspaceId, type, url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${type} API error (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function connectorJsonIfOk<T>(
  workspaceId: string,
  type: ConnectorType,
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await connectorFetch(workspaceId, type, url, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: body.slice(0, 200) };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

export function baseUrlFromConfig(config: Record<string, unknown>): string {
  return String(config.baseUrl ?? "").replace(/\/$/, "");
}
