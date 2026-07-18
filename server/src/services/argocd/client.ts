import {
  baseUrlFromConfig,
  connectorFetch,
  connectorJson,
  requireConnector,
} from "../connectors/connectorHttp.js";

async function argoUrl(workspaceId: string, path: string): Promise<string> {
  const { config } = await requireConnector(workspaceId, "argocd");
  const base = baseUrlFromConfig(config);
  if (!base) throw new Error("ArgoCD baseUrl is required in connector config");
  return `${base}${path}`;
}

export async function listApplications(options: {
  workspaceId: string;
}): Promise<unknown[]> {
  const url = await argoUrl(options.workspaceId, "/api/v1/applications");
  const data = await connectorJson<{ items: unknown[] }>(options.workspaceId, "argocd", url);
  return data.items ?? [];
}

export async function getApplication(options: {
  workspaceId: string;
  name: string;
}): Promise<unknown> {
  const url = await argoUrl(
    options.workspaceId,
    `/api/v1/applications/${encodeURIComponent(options.name)}`,
  );
  return connectorJson(options.workspaceId, "argocd", url);
}

export async function syncApplication(options: {
  workspaceId: string;
  name: string;
  revision?: string;
  prune?: boolean;
}): Promise<unknown> {
  const url = await argoUrl(
    options.workspaceId,
    `/api/v1/applications/${encodeURIComponent(options.name)}/sync`,
  );
  const res = await connectorFetch(options.workspaceId, "argocd", url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      revision: options.revision,
      prune: options.prune ?? false,
      dryRun: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ArgoCD sync failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function rollbackApplication(options: {
  workspaceId: string;
  name: string;
  id: number;
}): Promise<unknown> {
  const url = await argoUrl(
    options.workspaceId,
    `/api/v1/applications/${encodeURIComponent(options.name)}/rollback`,
  );
  const res = await connectorFetch(options.workspaceId, "argocd", url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: options.id }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ArgoCD rollback failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function getApplicationHistory(options: {
  workspaceId: string;
  name: string;
}): Promise<unknown[]> {
  const app = (await getApplication(options)) as { status?: { history?: unknown[] } };
  return app.status?.history ?? [];
}

export async function listApplicationEvents(options: {
  workspaceId: string;
  name: string;
}): Promise<unknown[]> {
  const url = await argoUrl(
    options.workspaceId,
    `/api/v1/applications/${encodeURIComponent(options.name)}/events`,
  );
  const data = await connectorJson<{ items: unknown[] }>(options.workspaceId, "argocd", url);
  return data.items ?? [];
}

export async function getApplicationResourceTree(options: {
  workspaceId: string;
  name: string;
}): Promise<unknown> {
  const url = await argoUrl(
    options.workspaceId,
    `/api/v1/applications/${encodeURIComponent(options.name)}/resource-tree`,
  );
  return connectorJson(options.workspaceId, "argocd", url);
}

export async function listProjects(options: {
  workspaceId: string;
}): Promise<unknown[]> {
  const url = await argoUrl(options.workspaceId, "/api/v1/projects");
  const data = await connectorJson<{ items: unknown[] }>(options.workspaceId, "argocd", url);
  return data.items ?? [];
}

export async function listRepositories(options: {
  workspaceId: string;
}): Promise<unknown[]> {
  const url = await argoUrl(options.workspaceId, "/api/v1/repositories");
  const data = await connectorJson<{ items: unknown[] }>(options.workspaceId, "argocd", url);
  return data.items ?? [];
}

export async function isArgoCDAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "argocd");
    return true;
  } catch {
    return false;
  }
}
