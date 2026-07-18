import { connectorJson, requireConnector } from "../connectors/connectorHttp.js";

const NOTION_API_BASE = "https://api.notion.com/v1";

export async function resolveDefaultDatabaseId(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "notion");
  const databaseId = String(config.defaultDatabaseId ?? "").trim();
  return databaseId || undefined;
}

export async function search(options: {
  workspaceId: string;
  query?: string;
  filter?: "page" | "database";
  pageSize?: number;
}): Promise<unknown> {
  const body: Record<string, unknown> = {
    page_size: options.pageSize ?? 25,
  };
  if (options.query?.trim()) body.query = options.query.trim();
  if (options.filter) {
    body.filter = { property: "object", value: options.filter };
  }

  return connectorJson(options.workspaceId, "notion", `${NOTION_API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getPage(options: {
  workspaceId: string;
  pageId: string;
  includeBlocks?: boolean;
}): Promise<unknown> {
  const page = await connectorJson(
    options.workspaceId,
    "notion",
    `${NOTION_API_BASE}/pages/${encodeURIComponent(options.pageId)}`,
  );

  if (!options.includeBlocks) {
    return page;
  }

  const blocks = await connectorJson(
    options.workspaceId,
    "notion",
    `${NOTION_API_BASE}/blocks/${encodeURIComponent(options.pageId)}/children?page_size=100`,
  );

  return { page, blocks };
}

export async function listDatabases(options: {
  workspaceId: string;
  query?: string;
  pageSize?: number;
}): Promise<unknown> {
  return search({
    workspaceId: options.workspaceId,
    query: options.query,
    filter: "database",
    pageSize: options.pageSize ?? 50,
  });
}

export async function queryDatabase(options: {
  workspaceId: string;
  databaseId?: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  pageSize?: number;
}): Promise<unknown> {
  const databaseId =
    options.databaseId?.trim() ?? (await resolveDefaultDatabaseId(options.workspaceId));
  if (!databaseId) {
    throw new Error(
      "Database ID is required. Provide databaseId or configure defaultDatabaseId in the connector.",
    );
  }

  const body: Record<string, unknown> = {
    page_size: options.pageSize ?? 25,
  };
  if (options.filter) body.filter = options.filter;
  if (options.sorts?.length) body.sorts = options.sorts;

  return connectorJson(
    options.workspaceId,
    "notion",
    `${NOTION_API_BASE}/databases/${encodeURIComponent(databaseId)}/query`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function isNotionAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "notion");
    return true;
  } catch {
    return false;
  }
}
