import { loadAllYaml } from "@kubernetes/client-node/dist/yaml.js";

export interface ManifestSummary {
  kinds: string[];
  names: string[];
  namespace?: string;
  serviceName?: string;
  deploymentName?: string;
  podName?: string;
  labelSelector?: string;
  memoryLimit?: string;
  memoryLeak?: boolean;
  image?: string;
}

function extractMemoryLimit(spec: Record<string, unknown>): string | undefined {
  const containers = (spec as { containers?: Array<{ resources?: { limits?: { memory?: string } } }> })
    .containers;
  return containers?.[0]?.resources?.limits?.memory;
}

function extractEnvLeak(spec: Record<string, unknown>): boolean | undefined {
  const containers = (spec as { containers?: Array<{ env?: Array<{ name?: string; value?: string }> }> })
    .containers;
  const leak = containers?.[0]?.env?.find((e) => e.name === "MEMORY_LEAK");
  return leak?.value?.toLowerCase() === "true";
}

function extractImage(spec: Record<string, unknown>): string | undefined {
  const containers = (spec as { containers?: Array<{ image?: string }> }).containers;
  return containers?.[0]?.image;
}

export function parseManifestSummary(manifestYaml: string): ManifestSummary {
  const docs = loadAllYaml(manifestYaml) as Array<Record<string, unknown>>;
  const summary: ManifestSummary = {
    kinds: [],
    names: [],
  };

  for (const doc of docs) {
    if (!doc || typeof doc !== "object") continue;
    const kind = String(doc.kind ?? "");
    const metadata = doc.metadata as { name?: string; namespace?: string } | undefined;
    const name = metadata?.name;
    const ns = metadata?.namespace;

    if (kind) summary.kinds.push(kind);
    if (name) summary.names.push(name);
    if (ns && !summary.namespace) summary.namespace = ns;

    if (kind === "Deployment") {
      summary.deploymentName = name;
      const spec = doc.spec as Record<string, unknown> | undefined;
      const template = spec?.template as { metadata?: { labels?: Record<string, string> }; spec?: Record<string, unknown> } | undefined;
      const labels = template?.metadata?.labels ?? (spec?.selector as { matchLabels?: Record<string, string> })?.matchLabels;
      if (labels) {
        summary.labelSelector = Object.entries(labels)
          .map(([k, v]) => `${k}=${v}`)
          .join(",");
        summary.serviceName = labels.app ?? name;
      }
      if (template?.spec) {
        summary.memoryLimit = extractMemoryLimit(template.spec);
        summary.memoryLeak = extractEnvLeak(template.spec);
        summary.image = extractImage(template.spec);
      }
    }

    if (kind === "Pod") {
      summary.podName = name;
      summary.serviceName = summary.serviceName ?? name;
      const spec = doc.spec as Record<string, unknown> | undefined;
      if (spec) {
        summary.memoryLimit = extractMemoryLimit(spec);
        summary.memoryLeak = extractEnvLeak(spec);
        summary.image = extractImage(spec);
      }
    }
  }

  return summary;
}

export function defaultStableServiceManifest(namespace: string): string {
  return `apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: ${namespace}
spec:
  type: ClusterIP
  selector:
    app: payment-service
    version: stable
  ports:
    - name: http
      port: 8080
      targetPort: 8080
`;
}
