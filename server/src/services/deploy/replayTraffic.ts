import { applyManifest, getPodLogs, listPods } from "../kubernetes/client.js";
import { listAlerts } from "../prometheus/client.js";

export interface ReplayServiceTarget {
  name: string;
  namespace: string;
  port: number;
  healthPath?: string;
  orderPath?: string;
}

export interface ReplayTrafficInput {
  workspaceId: string;
  namespace: string;
  services?: ReplayServiceTarget[];
  requestsPerService?: number;
  serviceName?: string;
}

export interface ReplayTrafficResult {
  jobName: string;
  impactedApps: string[];
  replayLog?: string;
  successCount: number;
  failureCount: number;
}

const DEFAULT_TARGETS: Omit<ReplayServiceTarget, "namespace">[] = [
  { name: "payment-service", port: 8080, healthPath: "/health", orderPath: "/api/create-order" },
  { name: "order-api", port: 8081, healthPath: "/health", orderPath: "/api/create-order" },
];

export async function detectImpactedApps(options: {
  workspaceId: string;
  namespace?: string;
  fallback?: string[];
}): Promise<string[]> {
  const apps = new Set<string>(options.fallback ?? []);

  try {
    const alerts = await listAlerts({ workspaceId: options.workspaceId });
    for (const alert of alerts as Array<{ labels?: Record<string, string>; state?: string }>) {
      if (alert.state && alert.state !== "firing") continue;
      const svc = alert.labels?.service ?? alert.labels?.app;
      if (svc) apps.add(svc);
    }
  } catch {
    // Prometheus optional
  }

  if (options.namespace) {
    try {
      const pods = await listPods({
        workspaceId: options.workspaceId,
        namespace: options.namespace,
      });
      for (const pod of pods) {
        if (pod.terminalFailure) {
          apps.add(pod.name.split("-")[0] ?? pod.name);
        }
      }
    } catch {
      // best-effort
    }
  }

  return [...apps];
}

const REPLAY_SCRIPT_INDENT = "              ";

function indentReplayScript(lines: string[]): string {
  return lines.map((line) => `${REPLAY_SCRIPT_INDENT}${line}`).join("\n");
}

function buildReplayJobManifest(
  namespace: string,
  targets: ReplayServiceTarget[],
  requestsPerService: number,
): string {
  const script = indentReplayScript(
    targets.flatMap((t) => {
      const base = `http://${t.name}:${t.port}`;
      const health = t.healthPath ?? "/health";
      const order = t.orderPath ?? "/api/create-order";
      return [
        `echo "==> Replaying ${t.name}"`,
        ...Array.from({ length: requestsPerService }, (_, i) =>
          `curl -sf -o /dev/null -w "${t.name} health %${i} -> %{http_code}\\n" ${base}${health} || echo "${t.name} health failed"`,
        ),
        ...Array.from({ length: requestsPerService }, (_, i) =>
          `curl -sf -X POST -H "Content-Type: application/json" -d "{\\"orderId\\":\\"replay-${i}\\"}" -o /dev/null -w "${t.name} order %${i} -> %{http_code}\\n" ${base}${order} || echo "${t.name} order failed"`,
        ),
      ];
    }),
  );

  const jobName = `kube-memory-replay-${Date.now()}`;

  return `apiVersion: batch/v1
kind: Job
metadata:
  name: ${jobName}
  namespace: ${namespace}
spec:
  ttlSecondsAfterFinished: 120
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: replay
          image: curlimages/curl:8.5.0
          command: ["/bin/sh", "-c"]
          args:
            - |
              set -e
              ${script}
              echo "Replay complete"
`;

}

function countReplayResults(log: string): { successCount: number; failureCount: number } {
  const lines = log.split("\n");
  let successCount = 0;
  let failureCount = 0;
  for (const line of lines) {
    if (line.includes("-> 2") || line.includes("-> 201")) successCount++;
    if (line.includes("failed") || line.includes("-> 5") || line.includes("-> 000")) failureCount++;
  }
  return { successCount, failureCount };
}

export async function replayImpactedTraffic(input: ReplayTrafficInput): Promise<ReplayTrafficResult> {
  const impactedApps = await detectImpactedApps({
    workspaceId: input.workspaceId,
    namespace: input.namespace,
    fallback: input.services?.map((s) => s.name) ?? DEFAULT_TARGETS.map((t) => t.name),
  });

  const targets: ReplayServiceTarget[] =
    input.services ??
    DEFAULT_TARGETS.map((t) => ({ ...t, namespace: input.namespace }));

  const requestsPerService = input.requestsPerService ?? 3;
  const manifest = buildReplayJobManifest(input.namespace, targets, requestsPerService);
  const jobNameMatch = manifest.match(/name: (kube-memory-replay-\d+)/);
  const jobName = jobNameMatch?.[1] ?? "kube-memory-replay";

  await applyManifest({
    workspaceId: input.workspaceId,
    manifestYaml: manifest,
    namespace: input.namespace,
  });

  await sleep(8000);

  let replayLog = "";
  try {
    replayLog = await getPodLogs({
      workspaceId: input.workspaceId,
      namespace: input.namespace,
      name: `${jobName}-`,
      tail: 100,
    });
  } catch {
    try {
      const pods = await listPods({
        workspaceId: input.workspaceId,
        namespace: input.namespace,
        labelSelector: `job-name=${jobName}`,
      });
      if (pods[0]?.name) {
        replayLog = await getPodLogs({
          workspaceId: input.workspaceId,
          namespace: input.namespace,
          name: pods[0].name,
          tail: 100,
        });
      }
    } catch {
      replayLog = "Could not fetch replay job logs";
    }
  }

  const counts = countReplayResults(replayLog);
  return {
    jobName,
    impactedApps,
    replayLog,
    ...counts,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
