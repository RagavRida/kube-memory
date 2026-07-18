import {
  createBranch,
  createOrUpdateFile,
  createPullRequest,
  resolveOwner,
  resolvePaymentServiceRepo,
} from "../github/client.js";

export async function createFixPullRequest(options: {
  workspaceId: string;
  incidentId: string;
  owner?: string;
  repo?: string;
  fixedManifest: string;
  manifestPath?: string;
  rootCause?: string;
  recommendedFix?: string;
  memorySnippet?: string;
}): Promise<{ prUrl: string; prNumber: number; branch: string } | undefined> {
  const defaults = resolvePaymentServiceRepo();
  const owner = options.owner ?? defaults.owner;
  const repo = options.repo ?? defaults.repo;

  if (!owner || !repo) {
    return undefined;
  }

  const resolvedOwner = await resolveOwner(options.workspaceId, owner);
  const branch = `kube-memory/fix-${options.incidentId.slice(0, 8)}`;
  const filePath = options.manifestPath ?? "k8s/payment-service-canary.yaml";

  await createBranch({
    workspaceId: options.workspaceId,
    owner: resolvedOwner,
    repo,
    branch,
  });

  await createOrUpdateFile({
    workspaceId: options.workspaceId,
    owner: resolvedOwner,
    repo,
    path: filePath,
    content: options.fixedManifest,
    message: `[kube-memory bot] fix: raise memory limits for ${options.incidentId}`,
    branch,
  });

  const body = [
    "## kube-memory automated fix",
    "",
    `**Incident ID:** \`${options.incidentId}\``,
    "",
    options.rootCause ? `**Root cause:** ${options.rootCause}` : "",
    options.recommendedFix ? `**Remediation:** ${options.recommendedFix}` : "",
    options.memorySnippet
      ? `\n**Similar past incidents (Cognee):**\n${options.memorySnippet.slice(0, 1500)}`
      : "",
    "",
    "This PR was opened automatically by kube-memory MCP during the kube-deploy failure path.",
  ]
    .filter(Boolean)
    .join("\n");

  const pr = await createPullRequest({
    workspaceId: options.workspaceId,
    owner: resolvedOwner,
    repo,
    title: `[kube-memory bot] Fix OOM — incident ${options.incidentId.slice(0, 8)}`,
    body,
    head: branch,
  });

  return { prUrl: pr.html_url, prNumber: pr.number, branch };
}
