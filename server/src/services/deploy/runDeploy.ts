import type { Types } from "mongoose";
import {
  recallMemory,
  scoreRecallSimilarity,
  type RecallResult,
} from "../memory/recall.js";
import { rememberMemory } from "../memory/remember.js";
import {
  applyManifest,
  deletePod,
  getPodLogs,
  getPodStatus,
  listEvents,
  listPods,
  type PodStatusSummary,
} from "../kubernetes/client.js";
import { postMessage, resolveDefaultChannel, isSlackAvailable } from "../slack/client.js";
import { openIncident, updateIncident } from "../incident/openIncident.js";
import { createFixPullRequest } from "./createFixPr.js";
import {
  defaultStableServiceManifest,
  parseManifestSummary,
} from "./parseManifest.js";
import { detectImpactedApps, replayImpactedTraffic } from "./replayTraffic.js";
import {
  buildActionSummary,
  logAction,
  resetActionLog,
  type DeployAction,
} from "./actionLog.js";

export interface KubeDeployInput {
  manifest: string;
  stableManifest?: string;
  namespace?: string;
  serviceName?: string;
  podName?: string;
  githubOwner?: string;
  githubRepo?: string;
  slackChannel?: string;
  triggerPagerDuty?: boolean;
  pagerDutyServiceId?: string;
  watchDurationSec?: number;
  pollIntervalSec?: number;
  argocdApplication?: string;
  dryRun?: boolean;
}

export interface DeployProgress {
  phase: string;
  message: string;
  timestamp: string;
}

export interface KubeDeployResult {
  outcome: "success" | "failure" | "dry_run";
  phases: DeployProgress[];
  actions: DeployAction[];
  actionSummary: string;
  manifestSummary?: ReturnType<typeof parseManifestSummary>;
  applyResult?: unknown;
  podStatus?: PodStatusSummary;
  riskScore?: number;
  riskReason?: string;
  incidentId?: string;
  fixPrUrl?: string;
  impactedApps?: string[];
  replayResults?: unknown;
  memoryRecordId?: string;
  slackChannel?: string;
  pagerDutyIncidentId?: string;
}

function progress(phase: string, message: string): DeployProgress {
  return { phase, message, timestamp: new Date().toISOString() };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findWorstPod(
  workspaceId: string,
  namespace: string,
  labelSelector?: string,
  podName?: string,
): Promise<PodStatusSummary | undefined> {
  if (podName) {
    try {
      return await getPodStatus({ workspaceId, namespace, name: podName });
    } catch {
      return undefined;
    }
  }

  if (!labelSelector) return undefined;

  const pods = await listPods({ workspaceId, namespace, labelSelector });
  if (!pods.length) return undefined;

  const failed = pods.find((p) => p.terminalFailure);
  return failed ?? pods[0];
}

async function deleteCanaryPods(
  workspaceId: string,
  namespace: string,
  labelSelector?: string,
): Promise<string[]> {
  if (!labelSelector) return [];
  const pods = await listPods({ workspaceId, namespace, labelSelector });
  const deleted: string[] = [];
  for (const pod of pods) {
    try {
      await deletePod({ workspaceId, namespace, name: pod.name });
      deleted.push(pod.name);
    } catch {
      // continue
    }
  }
  return deleted;
}

export async function runDeploy(
  ctx: { workspaceId: Types.ObjectId; datasetName: string },
  input: KubeDeployInput,
): Promise<KubeDeployResult> {
  const phases: DeployProgress[] = [];
  const actions: DeployAction[] = [];
  resetActionLog();
  const workspaceId = ctx.workspaceId.toString();
  const summary = parseManifestSummary(input.manifest);
  const namespace = input.namespace ?? summary.namespace ?? "default";
  const serviceName = input.serviceName ?? summary.serviceName ?? summary.deploymentName ?? "unknown";
  const watchDurationSec = input.watchDurationSec ?? 90;
  const pollIntervalSec = input.pollIntervalSec ?? 10;

  phases.push(progress("pre_deploy", `Scanning manifest: ${summary.kinds.join(", ")} in ${namespace}`));
  actions.push(logAction("pre_deploy", "scan_manifest", "ok", `${summary.kinds.join(", ")} in ${namespace}`));
  if (summary.memoryLimit) {
    phases.push(progress("pre_deploy", `Memory limit: ${summary.memoryLimit}${summary.memoryLeak ? " (MEMORY_LEAK enabled)" : ""}`));
  }

  const recallQuery = `Past failures OOM for ${serviceName} in ${namespace}`;
  let recall: RecallResult = { query: recallQuery, matches: [], datasetName: ctx.datasetName };
  let riskScore = 0;
  let riskReason = "Low risk: no strong memory matches";
  let cogneeSkipped = false;

  try {
    recall = await recallMemory(
      { datasetName: ctx.datasetName },
      { query: recallQuery, topK: 5 },
    );
    riskScore = scoreRecallSimilarity(recall.matches);
    riskReason =
      riskScore >= 0.6
        ? `High risk: ${recall.matches.length} similar past events`
        : riskScore >= 0.3
          ? "Moderate risk: some related history"
          : "Low risk: no strong memory matches";
    phases.push(progress("pre_deploy", `Risk score: ${riskScore.toFixed(2)} — ${riskReason}`));
    actions.push(logAction("pre_deploy", "predict_risk", "ok", `score=${riskScore.toFixed(2)}`));
  } catch (err) {
    cogneeSkipped = true;
    const msg = err instanceof Error ? err.message : String(err);
    riskReason = "Cognee unavailable — risk scoring skipped";
    phases.push(progress("pre_deploy", `Risk score: skipped — ${msg}`));
    actions.push(logAction("pre_deploy", "predict_risk", "skipped", msg));
  }

  if (input.dryRun) {
    phases.push(progress("apply", "Dry run — manifest not applied"));
    actions.push(logAction("apply", "k8s_apply_manifest", "skipped", "dryRun=true"));
    const actionSummary = buildActionSummary(actions, phases, { outcome: "dry_run" });
    return {
      outcome: "dry_run",
      phases,
      actions,
      actionSummary,
      manifestSummary: summary,
      riskScore,
      riskReason,
    };
  }

  const applyResult = await applyManifest({
    workspaceId,
    manifestYaml: input.manifest,
    namespace,
  });
  phases.push(
    progress(
      "apply",
      `Applied ${applyResult.applied.length} resource(s): ${applyResult.applied.map((r) => `${r.kind}/${r.name}`).join(", ")}`,
    ),
  );
  actions.push(
    logAction(
      "apply",
      "k8s_apply_manifest",
      applyResult.applied.length ? "ok" : "failed",
      applyResult.applied.map((r) => `${r.kind}/${r.name} (${r.action})`).join(", "),
    ),
  );

  const deadline = Date.now() + watchDurationSec * 1000;
  let podStatus: PodStatusSummary | undefined;
  let failureDetected = false;

  phases.push(progress("watch", `Monitoring pod health for up to ${watchDurationSec}s (every ${pollIntervalSec}s)`));

  while (Date.now() < deadline) {
    podStatus = await findWorstPod(
      workspaceId,
      namespace,
      summary.labelSelector,
      input.podName ?? summary.podName,
    );

    if (podStatus) {
      const oom = podStatus.containers.some((c) => c.oomKilled || c.reason === "OOMKilled");
      phases.push(
        progress(
          "watch",
          `Pod ${podStatus.name}: phase=${podStatus.phase}, healthy=${podStatus.healthy}, terminalFailure=${podStatus.terminalFailure}${oom ? ", OOMKilled" : ""}`,
        ),
      );

      if (podStatus.terminalFailure || oom) {
        failureDetected = true;
        break;
      }

      if (podStatus.healthy && summary.memoryLeak) {
        // Canary with leak may still be "healthy" until OOM — keep watching
      } else if (podStatus.healthy && !summary.memoryLeak) {
        // Non-leaking deploy is healthy — continue full watch window for stability
      }
    } else {
      phases.push(progress("watch", "Waiting for pod to appear..."));
    }

    await sleep(pollIntervalSec * 1000);
  }

  if (!failureDetected) {
    phases.push(progress("success", "Deployment stable for watch window"));

    if (await isSlackAvailable(workspaceId)) {
      const channel = input.slackChannel ?? (await resolveDefaultChannel(workspaceId));
      if (channel) {
        await postMessage({
          workspaceId,
          channel,
          text: `✅ *Deployment success* — \`${serviceName}\` in \`${namespace}\`\nMonitored ${watchDurationSec}s — all stable.`,
        });
      }
    }

    let memoryRecordId: string | undefined;
    try {
      const mem = await rememberMemory(ctx, {
        text: `Successful deploy of ${serviceName} in ${namespace} at ${new Date().toISOString()}`,
      });
      memoryRecordId = mem.recordId;
    } catch {
      // optional
    }

    actions.push(logAction("success", "memory_remember", memoryRecordId ? "ok" : "skipped"));

    const actionSummary = buildActionSummary(actions, phases, { outcome: "success", memoryRecordId });
    return {
      outcome: "success",
      phases,
      actions,
      actionSummary,
      manifestSummary: summary,
      applyResult,
      podStatus,
      riskScore,
      riskReason,
      memoryRecordId,
    };
  }

  phases.push(progress("failure", "Failure detected — starting incident pipeline"));
  actions.push(logAction("watch", "detect_failure", "ok", podStatus?.name ?? "unknown pod"));

  const podName = podStatus?.name ?? input.podName ?? summary.podName;
  let logs = "";
  try {
    if (podName) {
      logs = await getPodLogs({ workspaceId, namespace, name: podName, tail: 150 });
    }
  } catch {
    logs = "Could not fetch pod logs";
  }

  const events = await listEvents({ workspaceId, namespace }).catch(() => []);
  phases.push(progress("diagnose", `Fetched logs (${logs.length} chars) and ${events.length} events`));
  actions.push(logAction("diagnose", "k8s_pod_logs + k8s_get_events", "ok", `${events.length} events`));

  const memoryMatches = recall.matches.map((m) => m.text).join("\n---\n");
  phases.push(
    progress(
      "diagnose",
      cogneeSkipped
        ? "Cognee recall skipped — API unavailable"
        : `Cognee recall: ${recall.matches.length} similar episode(s)`,
    ),
  );

  const impactedApps = await detectImpactedApps({
    workspaceId,
    namespace,
    fallback: [serviceName, "order-api"],
  });
  phases.push(progress("diagnose", `Impacted apps: ${impactedApps.join(", ")}`));

  phases.push(progress("mitigate", "Routing traffic to stable — applying stable Service selector"));
  await applyManifest({
    workspaceId,
    manifestYaml: defaultStableServiceManifest(namespace),
    namespace,
  });
  actions.push(logAction("mitigate", "k8s_apply_manifest (stable service)", "ok", "selector version=stable"));

  const deletedPods = await deleteCanaryPods(workspaceId, namespace, summary.labelSelector);
  if (deletedPods.length) {
    phases.push(progress("mitigate", `Deleted canary pod(s): ${deletedPods.join(", ")}`));
    actions.push(logAction("mitigate", "k8s_delete_pod", "ok", deletedPods.join(", ")));
  } else {
    actions.push(logAction("mitigate", "k8s_delete_pod", "skipped", "no canary pods found"));
  }

  const incident = await openIncident(ctx, {
    serviceName,
    namespace,
    podName,
    githubOwner: input.githubOwner,
    githubRepo: input.githubRepo,
    argocdApplication: input.argocdApplication,
    notifySlack: true,
    slackChannel: input.slackChannel,
    triggerPagerDuty: input.triggerPagerDuty ?? false,
    pagerDutyServiceId: input.pagerDutyServiceId,
    rememberInMemory: true,
    impactedServices: impactedApps,
  });

  phases.push(progress("incident", `Opened incident ${incident.incidentId}`));
  actions.push(
    logAction(
      "incident",
      "incident_open",
      "ok",
      `id=${incident.incidentId} slack=${incident.slackChannel ?? "n/a"} pd=${incident.pagerDutyIncidentId ?? "skipped"}`,
    ),
  );

  let fixPrUrl: string | undefined;
  if (input.stableManifest) {
    try {
      const pr = await createFixPullRequest({
        workspaceId,
        incidentId: incident.incidentId,
        owner: input.githubOwner,
        repo: input.githubRepo,
        fixedManifest: input.stableManifest,
        rootCause: incident.rootCauseDescription,
        recommendedFix: incident.recommendedFix,
        memorySnippet: memoryMatches,
      });
      if (pr) {
        fixPrUrl = pr.prUrl;
        phases.push(progress("fix_pr", `Created fix PR: ${fixPrUrl}`));
        actions.push(logAction("fix_pr", "github_create_pull_request", "ok", fixPrUrl));

        await updateIncident(
          { workspaceId: ctx.workspaceId, datasetName: ctx.datasetName },
          incident.incidentId,
          {
            status: "investigating",
            fixPrUrl,
            note: `Automated fix PR: ${fixPrUrl}`,
            notifySlack: true,
            slackChannel: input.slackChannel,
          },
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      phases.push(progress("fix_pr", `PR creation skipped: ${msg}`));
      actions.push(logAction("fix_pr", "github_create_pull_request", "failed", msg));
    }
  } else {
    phases.push(progress("fix_pr", "No stableManifest provided — skipped automated PR"));
    actions.push(logAction("fix_pr", "github_create_pull_request", "skipped", "no stableManifest"));
  }

  let replayResults: unknown;
  try {
    replayResults = await replayImpactedTraffic({
      workspaceId,
      namespace,
    });
    phases.push(
      progress(
        "replay",
        `Replayed traffic on stable instances — success=${(replayResults as { successCount?: number }).successCount ?? 0}`,
      ),
    );
    actions.push(logAction("replay", "replay_impacted_traffic", "ok"));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    phases.push(progress("replay", `Replay skipped: ${msg}`));
    actions.push(logAction("replay", "replay_impacted_traffic", "failed", msg));
  }

  phases.push(progress("resolve", "Waiting for stable pod health..."));
  await sleep(10000);

  const stablePods = await listPods({
    workspaceId,
    namespace,
    labelSelector: "app=payment-service,version=stable",
  });
  const stableHealthy = stablePods.some((p) => p.healthy);
  phases.push(progress("resolve", `Stable pod healthy: ${stableHealthy}`));

  await updateIncident(
    { workspaceId: ctx.workspaceId, datasetName: ctx.datasetName },
    incident.incidentId,
    {
      status: "resolved",
      note: `Mitigated — traffic on stable. ${fixPrUrl ? `Fix PR: ${fixPrUrl}` : ""}`,
      fixPrUrl,
      notifySlack: true,
      slackChannel: input.slackChannel,
      rememberResolution: true,
    },
  );

  phases.push(progress("complete", "Incident resolved and recorded in Cognee"));
  actions.push(logAction("resolve", "incident_update", "ok", "status=resolved"));

  const actionSummary = buildActionSummary(actions, phases, {
    outcome: "failure",
    incidentId: incident.incidentId,
    fixPrUrl,
    slackChannel: incident.slackChannel,
    pagerDutyIncidentId: incident.pagerDutyIncidentId,
    memoryRecordId: incident.memoryRecordId,
  });

  return {
    outcome: "failure",
    phases,
    actions,
    actionSummary,
    manifestSummary: summary,
    applyResult,
    podStatus,
    riskScore,
    riskReason,
    incidentId: incident.incidentId,
    fixPrUrl,
    impactedApps,
    replayResults,
    memoryRecordId: incident.memoryRecordId,
    slackChannel: incident.slackChannel,
    pagerDutyIncidentId: incident.pagerDutyIncidentId,
  };
}
