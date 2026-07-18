import { getConnectorSecret } from "../connectors/connectorSecrets.js";
import { getEnv } from "../../config/env.js";
import { listEvents, getPodLogs, getPod } from "../kubernetes/client.js";
import { listCommits, listPullRequests, resolveOwner, isGitHubAvailable } from "../github/client.js";
import { listAlerts, instantQuery, isPrometheusAvailable } from "../prometheus/client.js";
import { getApplication, isArgoCDAvailable } from "../argocd/client.js";
import { recallMemory } from "../memory/recall.js";
import { isCogneeConfigured } from "../cognee/client.js";
import type { IncidentContextSnapshot } from "./types.js";

async function isKubernetesAvailable(workspaceId: string): Promise<boolean> {
  const connector = await getConnectorSecret(workspaceId, "kubernetes");
  if (connector?.secret) return true;
  return Boolean(getEnv().KUBECONFIG_BASE64);
}

async function tryKubernetes(
  workspaceId: string,
  namespace?: string,
  podName?: string,
): Promise<IncidentContextSnapshot["kubernetes"]> {
  if (!(await isKubernetesAvailable(workspaceId))) {
    return { error: "Kubernetes connector not configured" };
  }

  try {
    const ns = namespace ?? "default";
    const fieldSelector = podName ? `involvedObject.name=${podName}` : undefined;
    const events = await listEvents({ workspaceId, namespace: ns, fieldSelector });
    let logs: string | undefined;
    let podStatus: { phase?: string; containerReason?: string; exitCode?: number } | undefined;
    if (podName) {
      logs = await getPodLogs({ workspaceId, name: podName, namespace: ns, tail: 50 });
      try {
        const pod = await getPod({ workspaceId, name: podName, namespace: ns });
        const container = pod.status?.containerStatuses?.[0];
        podStatus = {
          phase: pod.status?.phase,
          containerReason: container?.state?.terminated?.reason ?? container?.lastState?.terminated?.reason,
          exitCode: container?.state?.terminated?.exitCode ?? container?.lastState?.terminated?.exitCode,
        };
      } catch {
        // pod status optional
      }
    }
    return { events, logs, podStatus };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Kubernetes enrichment failed" };
  }
}

async function tryGitHub(
  workspaceId: string,
  owner?: string,
  repo?: string,
): Promise<IncidentContextSnapshot["github"]> {
  if (!repo) return undefined;
  if (!(await isGitHubAvailable(workspaceId))) {
    return { error: "GitHub connector not configured" };
  }

  try {
    const resolvedOwner = await resolveOwner(workspaceId, owner);
    const [commits, pullRequests] = await Promise.all([
      listCommits({ workspaceId, owner: resolvedOwner, repo, perPage: 5 }),
      listPullRequests({ workspaceId, owner: resolvedOwner, repo, state: "open", perPage: 5 }),
    ]);
    return { commits, pullRequests };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "GitHub enrichment failed" };
  }
}

async function tryPrometheus(
  workspaceId: string,
  namespace?: string,
  podName?: string,
  customQuery?: string,
): Promise<IncidentContextSnapshot["prometheus"]> {
  if (!(await isPrometheusAvailable(workspaceId))) {
    return { error: "Prometheus connector not configured" };
  }

  try {
    const alertsRaw = await listAlerts({ workspaceId });
    const alertsData = alertsRaw as { data?: { alerts?: unknown[] } };
    let alerts = alertsData.data?.alerts ?? [];

    if (namespace || podName) {
      const needle = `${namespace ?? ""} ${podName ?? ""}`.toLowerCase();
      alerts = (alerts as Array<{ labels?: Record<string, string>; annotations?: Record<string, string> }>).filter(
        (alert) => {
          const blob = JSON.stringify({ ...alert.labels, ...alert.annotations }).toLowerCase();
          return needle.split(/\s+/).filter(Boolean).some((part) => blob.includes(part));
        },
      );
    }

    const defaultQuery =
      namespace && podName
        ? `sum(container_memory_working_set_bytes{namespace="${namespace}", pod="${podName}"})`
        : namespace
          ? `sum by (pod) (container_memory_working_set_bytes{namespace="${namespace}"})`
          : undefined;

    const query = customQuery ?? defaultQuery;
    let queryResult: unknown;
    if (query) {
      queryResult = await instantQuery({ workspaceId, query });
    }

    return { alerts, query, queryResult };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Prometheus enrichment failed" };
  }
}

async function tryArgoCD(
  workspaceId: string,
  applicationName?: string,
): Promise<IncidentContextSnapshot["argocd"]> {
  if (!applicationName) return undefined;
  if (!(await isArgoCDAvailable(workspaceId))) {
    return { error: "ArgoCD connector not configured" };
  }

  try {
    const application = await getApplication({ workspaceId, name: applicationName });
    return { application };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ArgoCD enrichment failed" };
  }
}

async function tryMemoryRecall(
  datasetName: string,
  serviceName: string,
  namespace?: string,
): Promise<IncidentContextSnapshot["memory"]> {
  if (!isCogneeConfigured()) {
    return { error: "Cognee not configured — semantic recall skipped" };
  }

  try {
    const query = `Past incidents for ${serviceName}${namespace ? ` in ${namespace}` : ""} OOM memory crash`;
    const similarEpisodes = await recallMemory({ datasetName }, { query, topK: 3 });
    return { similarEpisodes };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Memory recall failed" };
  }
}

export async function enrichIncidentContext(options: {
  workspaceId: string;
  datasetName: string;
  serviceName: string;
  namespace?: string;
  podName?: string;
  githubOwner?: string;
  githubRepo?: string;
  argocdApplication?: string;
  prometheusQuery?: string;
}): Promise<{ context: IncidentContextSnapshot; connectorsUsed: string[]; connectorsSkipped: string[] }> {
  const connectorsUsed: string[] = [];
  const connectorsSkipped: string[] = [];
  const context: IncidentContextSnapshot = {};

  const k8s = await tryKubernetes(options.workspaceId, options.namespace, options.podName);
  context.kubernetes = k8s;
  if (k8s?.error) connectorsSkipped.push("kubernetes");
  else if (k8s?.events || k8s?.logs) connectorsUsed.push("kubernetes");

  if (options.githubRepo) {
    const gh = await tryGitHub(options.workspaceId, options.githubOwner, options.githubRepo);
    context.github = gh;
    if (gh?.error) connectorsSkipped.push("github");
    else if (gh?.commits || gh?.pullRequests) connectorsUsed.push("github");
  }

  const prom = await tryPrometheus(
    options.workspaceId,
    options.namespace,
    options.podName,
    options.prometheusQuery,
  );
  context.prometheus = prom;
  if (prom?.error) connectorsSkipped.push("prometheus");
  else if (prom?.alerts || prom?.queryResult) connectorsUsed.push("prometheus");

  if (options.argocdApplication) {
    const argo = await tryArgoCD(options.workspaceId, options.argocdApplication);
    context.argocd = argo;
    if (argo?.error) connectorsSkipped.push("argocd");
    else if (argo?.application) connectorsUsed.push("argocd");
  }

  const mem = await tryMemoryRecall(options.datasetName, options.serviceName, options.namespace);
  context.memory = mem;
  if (mem?.error) connectorsSkipped.push("memory");
  else if (mem?.similarEpisodes) connectorsUsed.push("memory");

  return { context, connectorsUsed, connectorsSkipped };
}

export function buildClassificationText(context: IncidentContextSnapshot): string {
  const parts: string[] = [];
  if (context.kubernetes?.podStatus) {
    const ps = context.kubernetes.podStatus;
    parts.push(`${ps.phase ?? ""} ${ps.containerReason ?? ""} exit ${ps.exitCode ?? ""}`);
    if (ps.containerReason === "OOMKilled" || ps.exitCode === 137) {
      parts.push("OOMKilled out of memory");
    }
  }
  if (context.kubernetes?.logs) parts.push(context.kubernetes.logs);
  if (context.kubernetes?.events) {
    const events = context.kubernetes.events as Array<{ reason?: string; message?: string; type?: string }>;
    for (const ev of events.slice(-10)) {
      parts.push(`${ev.type ?? ""} ${ev.reason ?? ""} ${ev.message ?? ""}`);
    }
  }
  if (context.prometheus?.alerts) {
    parts.push(JSON.stringify(context.prometheus.alerts));
  }
  return parts.join("\n");
}
