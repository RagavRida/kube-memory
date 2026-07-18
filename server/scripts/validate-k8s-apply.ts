/**
 * Smoke tests for k8s apply manifest parsing/validation (no cluster required).
 * Run: npx tsx scripts/validate-k8s-apply.ts
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAllYaml } from "@kubernetes/client-node/dist/yaml.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const ALLOWED_KINDS = new Set([
  "Namespace",
  "Pod",
  "Service",
  "ConfigMap",
  "Secret",
  "Deployment",
]);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function validateKind(doc: { kind?: string }): void {
  assert(Boolean(doc.kind), "missing kind");
  assert(ALLOWED_KINDS.has(doc.kind!), `unsupported kind: ${doc.kind}`);
}

const oomManifest = readFileSync(
  resolve(repoRoot, "docs/k8s-test/oom-payment-simulator.yaml"),
  "utf8",
);
const namespaceManifest = readFileSync(
  resolve(repoRoot, "docs/k8s-test/namespace.yaml"),
  "utf8",
);
const multiDoc = `${namespaceManifest}\n---\n${oomManifest}`;

const multiDocs = loadAllYaml(multiDoc);
assert(multiDocs.length === 2, "expected 2 documents in multi-doc YAML");

for (const doc of multiDocs) {
  validateKind(doc as { kind?: string });
}

let rejected = false;
try {
  validateKind({ kind: "ClusterRoleBinding" });
} catch {
  rejected = true;
}
assert(rejected, "ClusterRoleBinding should be rejected");

console.log("validate-k8s-apply: all checks passed");
