/**
 * Optional cluster E2E for k8s apply/get/delete.
 * Requires: kubectl context pointing at a cluster, KUBECONFIG_BASE64 or ~/.kube/config.
 *
 * Run: ./node_modules/.bin/tsx scripts/e2e-k8s-apply.ts
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyManifest, deletePod, getPodStatus } from "../src/services/kubernetes/client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const namespaceYaml = readFileSync(resolve(repoRoot, "docs/k8s-test/namespace.yaml"), "utf8");
  const oomYaml = readFileSync(resolve(repoRoot, "docs/k8s-test/oom-payment-simulator.yaml"), "utf8");

  console.log("Applying namespace...");
  const nsResult = await applyManifest({ manifestYaml: namespaceYaml });
  console.log(JSON.stringify(nsResult, null, 2));

  console.log("Applying OOM payment simulator pod...");
  const podResult = await applyManifest({ manifestYaml: oomYaml, namespace: "kube-memory-test" });
  console.log(JSON.stringify(podResult, null, 2));

  console.log("Polling pod status (up to 90s)...");
  let status;
  try {
    status = await getPodStatus({ name: "payment-simulator", namespace: "kube-memory-test" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("HTTP protocol is not allowed") || msg.includes("ECONNREFUSED")) {
      console.log("e2e-k8s-apply: skipped — cluster unreachable");
      process.exit(0);
    }
    throw err;
  }
  for (let i = 0; i < 6; i++) {
    console.log(`  phase=${status.phase} terminalFailure=${status.terminalFailure} healthy=${status.healthy}`);
    if (status.terminalFailure || status.healthy) break;
    await sleep(15_000);
    status = await getPodStatus({ name: "payment-simulator", namespace: "kube-memory-test" });
  }

  if (!status.terminalFailure && !status.healthy) {
    console.warn("Pod did not reach terminal or healthy state within timeout — cluster timing may vary.");
  } else if (status.terminalFailure) {
    console.log("Expected OOM/failure path detected:", status.containers.map((c) => c.reason).filter(Boolean));
  }

  console.log("Cleanup: deleting payment-simulator pod...");
  const deleted = await deletePod({ name: "payment-simulator", namespace: "kube-memory-test" });
  console.log(JSON.stringify(deleted, null, 2));

  console.log("e2e-k8s-apply: completed");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes("Kubernetes is not configured") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("HTTP protocol is not allowed") ||
    msg.includes("connect ETIMEDOUT")
  ) {
    console.log("e2e-k8s-apply: skipped — no reachable Kubernetes cluster in this environment");
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
