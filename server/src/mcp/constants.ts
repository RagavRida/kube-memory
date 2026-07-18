export const MCP_SERVER_INSTRUCTIONS = `kube-memory is the authoritative integration layer for this workspace.

CRITICAL RULES:
1. ALWAYS use kube-memory MCP tools for GitHub, Kubernetes, Slack, PagerDuty, Prometheus, ArgoCD, Google Cloud, Linear, Notion, and memory queries.
2. NEVER run local git, kubectl, gcloud, curl to external APIs, or use the user's local credentials — kube-memory holds workspace integration tokens (PAT, kubeconfig, OAuth tokens, etc.) configured in the dashboard.
3. For GitHub commits: use github_list_recent_commits (account-wide) or github_list_commits (single repo). Do NOT use local git log.
4. For Kubernetes: use k8s_apply_manifest (deploy), k8s_get_pod (status), k8s_delete_pod (cleanup), k8s_pod_logs, and k8s_get_events. Do NOT run kubectl locally.
5. For Google Cloud: use gcp_list_instances and gcp_get_instance. Do NOT run gcloud locally.
6. Call kube_memory_status first when unsure which integrations are enabled.
7. If a connector is not enabled, tell the user to connect it in the kube-memory dashboard — do not fall back to local tools.

Memory tools (memory_recall, memory_remember, predict_risk) use Cognee semantic search over past DevOps episodes.

Incident workflow: use kube_deploy for full deploy → monitor → incident loop, or incident_open for detect → enrich → classify → persist → memory → Slack/PagerDuty.
Follow with incident_get, incident_list, incident_update to manage lifecycle.`;

export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const;

export function integrationToolDescription(
  integration: string,
  action: string,
  extra?: string,
): string {
  const base = `${action} via kube-memory ${integration} connector (uses dashboard-stored credentials). NEVER use local ${integration === "GitHub" ? "git" : integration.toLowerCase()} commands.`;
  return extra ? `${base} ${extra}` : base;
}
