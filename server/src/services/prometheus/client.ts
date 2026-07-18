import {
  baseUrlFromConfig,
  connectorJson,
  requireConnector,
} from "../connectors/connectorHttp.js";

async function promUrl(workspaceId: string, path: string): Promise<string> {
  const { config } = await requireConnector(workspaceId, "prometheus");
  const base = baseUrlFromConfig(config);
  if (!base) throw new Error("Prometheus baseUrl is required in connector config");
  return `${base}${path}`;
}

export async function instantQuery(options: {
  workspaceId: string;
  query: string;
  time?: string;
}): Promise<unknown> {
  const params = new URLSearchParams({ query: options.query });
  if (options.time) params.set("time", options.time);
  const url = await promUrl(options.workspaceId, `/api/v1/query?${params}`);
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function rangeQuery(options: {
  workspaceId: string;
  query: string;
  start: string;
  end: string;
  step?: string;
}): Promise<unknown> {
  const params = new URLSearchParams({
    query: options.query,
    start: options.start,
    end: options.end,
    step: options.step ?? "60s",
  });
  const url = await promUrl(options.workspaceId, `/api/v1/query_range?${params}`);
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listTargets(options: {
  workspaceId: string;
}): Promise<unknown> {
  const url = await promUrl(options.workspaceId, "/api/v1/targets");
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listAlerts(options: {
  workspaceId: string;
}): Promise<unknown> {
  const url = await promUrl(options.workspaceId, "/api/v1/alerts");
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listRules(options: {
  workspaceId: string;
  type?: "alert" | "record";
  ruleName?: string[];
  ruleGroup?: string[];
}): Promise<unknown> {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.ruleName?.length) {
    for (const name of options.ruleName) {
      params.append("rule_name[]", name);
    }
  }
  if (options.ruleGroup?.length) {
    for (const group of options.ruleGroup) {
      params.append("rule_group[]", group);
    }
  }
  const query = params.toString();
  const url = await promUrl(
    options.workspaceId,
    query ? `/api/v1/rules?${query}` : "/api/v1/rules",
  );
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listAlertmanagers(options: {
  workspaceId: string;
}): Promise<unknown> {
  const url = await promUrl(options.workspaceId, "/api/v1/alertmanagers");
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listLabels(options: {
  workspaceId: string;
  match?: string[];
  start?: string;
  end?: string;
}): Promise<unknown> {
  const params = new URLSearchParams();
  if (options.match?.length) {
    for (const selector of options.match) {
      params.append("match[]", selector);
    }
  }
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  const query = params.toString();
  const url = await promUrl(
    options.workspaceId,
    query ? `/api/v1/labels?${query}` : "/api/v1/labels",
  );
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function listLabelValues(options: {
  workspaceId: string;
  labelName: string;
  match?: string[];
  start?: string;
  end?: string;
}): Promise<unknown> {
  const params = new URLSearchParams();
  if (options.match?.length) {
    for (const selector of options.match) {
      params.append("match[]", selector);
    }
  }
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  const query = params.toString();
  const path = `/api/v1/label/${encodeURIComponent(options.labelName)}/values`;
  const url = await promUrl(options.workspaceId, query ? `${path}?${query}` : path);
  return connectorJson(options.workspaceId, "prometheus", url);
}

export async function isPrometheusAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "prometheus");
    return true;
  } catch {
    return false;
  }
}
