import * as k8s from "@kubernetes/client-node";
import { loadAllYaml } from "@kubernetes/client-node/dist/yaml.js";

const ALLOWED_KINDS = new Set([
  "Namespace",
  "Pod",
  "Service",
  "ConfigMap",
  "Secret",
  "Deployment",
  "Job",
]);

const K8S_NAME_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
const FIELD_MANAGER = "kube-memory";

export type ApplyManifestResult = {
  applied: Array<{
    kind: string;
    name: string;
    namespace?: string;
    action: "created" | "updated";
  }>;
  errors?: Array<{ kind?: string; name?: string; message: string }>;
};

function isApiException(err: unknown): err is { code: number; message?: string } {
  return typeof err === "object" && err !== null && "code" in err && typeof (err as { code: unknown }).code === "number";
}

function validateResource(spec: k8s.KubernetesObject): void {
  const kind = spec.kind;
  const name = spec.metadata?.name;

  if (!kind || !spec.apiVersion) {
    throw new Error("Each manifest document must include kind and apiVersion");
  }

  if (!ALLOWED_KINDS.has(kind)) {
    throw new Error(`Kind "${kind}" is not allowed. Supported: ${[...ALLOWED_KINDS].join(", ")}`);
  }

  if (!name || !K8S_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid or missing metadata.name for kind ${kind}`);
  }

  if (kind === "Secret") {
    const secretType = (spec as { type?: string }).type;
    if (
      secretType &&
      secretType !== "Opaque" &&
      secretType !== "kubernetes.io/service-account-token"
    ) {
      throw new Error(`Secret type "${secretType}" is not supported in v1`);
    }
  }
}

function withNamespace(
  spec: k8s.KubernetesObject,
  defaultNamespace?: string,
): k8s.KubernetesObject {
  if (spec.kind === "Namespace") {
    return spec;
  }

  const namespace = spec.metadata?.namespace ?? defaultNamespace;
  if (!namespace) {
    throw new Error(`Namespace is required for kind ${spec.kind} (${spec.metadata?.name})`);
  }

  return {
    ...spec,
    metadata: {
      ...spec.metadata,
      namespace,
    },
  };
}

async function applyOne(
  objectApi: k8s.KubernetesObjectApi,
  spec: k8s.KubernetesObject,
  dryRun?: boolean,
): Promise<"created" | "updated"> {
  const dryRunParam = dryRun ? "All" : undefined;
  const header = {
    apiVersion: spec.apiVersion!,
    kind: spec.kind!,
    metadata: {
      name: spec.metadata!.name!,
      namespace: spec.metadata?.namespace,
    },
  };

  try {
    await objectApi.read(header);
    await objectApi.replace(spec, undefined, dryRunParam, FIELD_MANAGER);
    return "updated";
  } catch (err) {
    if (isApiException(err) && err.code === 404) {
      await objectApi.create(spec, undefined, dryRunParam, FIELD_MANAGER);
      return "created";
    }

    if (isApiException(err) && (err.code === 409 || err.code === 422)) {
      await objectApi.replace(spec, undefined, dryRunParam, FIELD_MANAGER);
      return "updated";
    }

    try {
      await objectApi.create(spec, undefined, dryRunParam, FIELD_MANAGER);
      return "created";
    } catch (createErr) {
      if (isApiException(createErr) && (createErr.code === 409 || createErr.code === 422)) {
        await objectApi.replace(spec, undefined, dryRunParam, FIELD_MANAGER);
        return "updated";
      }
      throw createErr;
    }
  }
}

// SECURITY-REVIEW: applies user-supplied YAML to the connected Kubernetes cluster
export async function applyManifest(options: {
  manifestYaml: string;
  namespace?: string;
  dryRun?: boolean;
  objectApi: k8s.KubernetesObjectApi;
}): Promise<ApplyManifestResult> {
  const documents = loadAllYaml(options.manifestYaml).filter(
    (doc): doc is k8s.KubernetesObject =>
      doc !== null && typeof doc === "object" && "kind" in doc && Boolean((doc as k8s.KubernetesObject).kind),
  );

  if (documents.length === 0) {
    throw new Error("No Kubernetes resources found in manifest YAML");
  }

  const applied: ApplyManifestResult["applied"] = [];
  const errors: ApplyManifestResult["errors"] = [];

  for (const doc of documents) {
    try {
      validateResource(doc);
      const spec = withNamespace(doc, options.namespace);
      const action = await applyOne(options.objectApi, spec, options.dryRun);
      applied.push({
        kind: spec.kind!,
        name: spec.metadata!.name!,
        namespace: spec.metadata?.namespace,
        action,
      });
    } catch (err) {
      errors.push({
        kind: doc.kind,
        name: doc.metadata?.name,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    applied,
    ...(errors.length > 0 ? { errors } : {}),
  };
}
