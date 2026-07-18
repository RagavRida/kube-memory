import type { DeployProgress } from "./runDeploy.js";

export interface DeployAction {
  step: number;
  phase: string;
  action: string;
  status: "ok" | "skipped" | "failed";
  detail?: string;
  timestamp: string;
}

let stepCounter = 0;

export function resetActionLog(): void {
  stepCounter = 0;
}

export function logAction(
  phase: string,
  action: string,
  status: DeployAction["status"],
  detail?: string,
): DeployAction {
  stepCounter += 1;
  return {
    step: stepCounter,
    phase,
    action,
    status,
    detail,
    timestamp: new Date().toISOString(),
  };
}

export function buildActionSummary(
  actions: DeployAction[],
  phases: DeployProgress[],
  meta: {
    outcome: string;
    incidentId?: string;
    fixPrUrl?: string;
    slackChannel?: string;
    pagerDutyIncidentId?: string;
    memoryRecordId?: string;
  },
): string {
  const lines: string[] = [
    `# kube-deploy summary — ${meta.outcome}`,
    "",
    "## Actions taken",
    "",
  ];

  for (const a of actions) {
    const icon = a.status === "ok" ? "✓" : a.status === "skipped" ? "○" : "✗";
    lines.push(`${a.step}. [${icon}] **${a.phase}** — ${a.action}${a.detail ? `: ${a.detail}` : ""}`);
  }

  if (phases.length) {
    lines.push("", "## Watch log", "");
    for (const p of phases) {
      lines.push(`- \`${p.timestamp}\` **${p.phase}**: ${p.message}`);
    }
  }

  lines.push("", "## Results", "");
  if (meta.incidentId) lines.push(`- Incident: \`${meta.incidentId}\``);
  if (meta.fixPrUrl) lines.push(`- Fix PR: ${meta.fixPrUrl}`);
  if (meta.slackChannel) lines.push(`- Slack channel: \`${meta.slackChannel}\``);
  if (meta.pagerDutyIncidentId) lines.push(`- PagerDuty: \`${meta.pagerDutyIncidentId}\``);
  if (meta.memoryRecordId) lines.push(`- Memory record: \`${meta.memoryRecordId}\``);

  return lines.join("\n");
}
