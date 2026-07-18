import * as k8s from "@kubernetes/client-node";
import { getEnv } from "../../config/env.js";
import { getConnectorSecret } from "../connectors/connectorSecrets.js";
import { applyManifest as applyManifestDocs, type ApplyManifestResult } from "./applyManifest.js";
import { summarizePodStatus, type PodStatusSummary } from "./podStatus.js";

let globalKubeConfig: k8s.KubeConfig | null = null;

function loadGlobalKubeConfig(): k8s.KubeConfig {
  if (globalKubeConfig) return globalKubeConfig;

  const kc = new k8s.KubeConfig();
  const encoded = getEnv().KUBECONFIG_BASE64;

  if (encoded) {
    const yaml = Buffer.from(encoded, "base64").toString("utf8");
    kc.loadFromString(yaml);
  } else {
    kc.loadFromDefault();
  }

  globalKubeConfig = kc;
  return kc;
}

async function resolveKubeConfig(workspaceId?: string): Promise<k8s.KubeConfig | null> {
  if (workspaceId) {
    const connector = await getConnectorSecret(workspaceId, "kubernetes");
    if (connector?.secret) {
      const kc = new k8s.KubeConfig();
      kc.loadFromString(connector.secret);
      return kc;
    }
  }

  const encoded = getEnv().KUBECONFIG_BASE64;
  if (encoded) {
    const kc = new k8s.KubeConfig();
    kc.loadFromString(Buffer.from(encoded, "base64").toString("utf8"));
    return kc;
  }

  try {
    return loadGlobalKubeConfig();
  } catch {
    return null;
  }
}

export function getCoreV1ApiForKubeconfig(kubeconfigYaml: string): k8s.CoreV1Api {
  const kc = new k8s.KubeConfig();
  kc.loadFromString(kubeconfigYaml);
  return kc.makeApiClient(k8s.CoreV1Api);
}

async function resolveCoreV1Api(workspaceId?: string): Promise<k8s.CoreV1Api | null> {
  const kc = await resolveKubeConfig(workspaceId);
  return kc ? kc.makeApiClient(k8s.CoreV1Api) : null;
}

async function resolveObjectApi(workspaceId?: string): Promise<k8s.KubernetesObjectApi | null> {
  const kc = await resolveKubeConfig(workspaceId);
  return kc ? k8s.KubernetesObjectApi.makeApiClient(kc) : null;
}

export function isKubernetesConfigured(): boolean {
  return Boolean(getEnv().KUBECONFIG_BASE64);
}

export function getCoreV1Api(): k8s.CoreV1Api {
  return loadGlobalKubeConfig().makeApiClient(k8s.CoreV1Api);
}

export async function getPod(options: {
  name: string;
  namespace?: string;
  workspaceId?: string;
}): Promise<k8s.V1Pod> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  const namespace = options.namespace ?? "default";
  return api.readNamespacedPod({ name: options.name, namespace });
}

export async function getPodStatus(options: {
  name: string;
  namespace?: string;
  workspaceId?: string;
}): Promise<PodStatusSummary> {
  const pod = await getPod(options);
  return summarizePodStatus(pod);
}

export async function deletePod(options: {
  name: string;
  namespace?: string;
  workspaceId?: string;
}): Promise<{ deleted: boolean; name: string; namespace: string }> {
  const objectApi = await resolveObjectApi(options.workspaceId);
  if (!objectApi) {
    throw new Error("Kubernetes is not configured");
  }

  const namespace = options.namespace ?? "default";
  await objectApi.delete({
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name: options.name, namespace },
  });

  return { deleted: true, name: options.name, namespace };
}

export async function applyManifest(options: {
  manifestYaml: string;
  namespace?: string;
  dryRun?: boolean;
  workspaceId?: string;
}): Promise<ApplyManifestResult> {
  const objectApi = await resolveObjectApi(options.workspaceId);
  if (!objectApi) {
    throw new Error("Kubernetes is not configured");
  }

  return applyManifestDocs({
    manifestYaml: options.manifestYaml,
    namespace: options.namespace,
    dryRun: options.dryRun,
    objectApi,
  });
}

export async function getPodLogs(options: {
  name: string;
  namespace?: string;
  container?: string;
  tail?: number;
  workspaceId?: string;
}): Promise<string> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  const namespace = options.namespace ?? "default";
  const response = await api.readNamespacedPodLog({
    name: options.name,
    namespace,
    container: options.container,
    tailLines: options.tail ?? 100,
  });
  return typeof response === "string" ? response : String(response);
}

export async function listEvents(options: {
  namespace?: string;
  fieldSelector?: string;
  workspaceId?: string;
}): Promise<k8s.CoreV1Event[]> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  if (options.namespace) {
    const response = await api.listNamespacedEvent({
      namespace: options.namespace,
      fieldSelector: options.fieldSelector,
    });
    return response.items ?? [];
  }

  const response = await api.listEventForAllNamespaces({
    fieldSelector: options.fieldSelector,
  });
  return response.items ?? [];
}

export async function listPods(options: {
  namespace?: string;
  labelSelector?: string;
  workspaceId?: string;
}): Promise<PodStatusSummary[]> {
  const api = await resolveCoreV1Api(options.workspaceId);
  if (!api) {
    throw new Error("Kubernetes is not configured");
  }

  const namespace = options.namespace ?? "default";
  const response = await api.listNamespacedPod({
    namespace,
    labelSelector: options.labelSelector,
  });

  return (response.items ?? []).map(summarizePodStatus);
}

export type { ApplyManifestResult, PodStatusSummary };
