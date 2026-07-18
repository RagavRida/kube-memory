import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import { READ_ONLY_ANNOTATIONS, integrationToolDescription } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";
import {
  githubGetPullRequestInputSchema,
  githubListCommitsInputSchema,
  githubListIssuesInputSchema,
  githubListPullRequestsInputSchema,
  githubListRecentCommitsInputSchema,
  githubListRepositoriesInputSchema,
  githubCreateBranchInputSchema,
  githubCreateOrUpdateFileInputSchema,
  githubCreatePullRequestInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getAuthenticatedUser,
  getPullRequest,
  isGitHubAvailable,
  listCommits,
  listIssues,
  listPullRequests,
  listRecentCommits,
  listRepositories,
  resolveOwner,
  createBranch,
  createOrUpdateFile,
  createPullRequest,
} from "../../services/github/client.js";

export function registerGitHubTools(server: McpServer): void {
  server.registerTool(
    "github_get_authenticated_user",
    {
      title: "GitHub Authenticated User",
      description: integrationToolDescription(
        "GitHub",
        "Get the GitHub user for the workspace PAT",
        "Use this to discover the default owner/login before listing repos or commits.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const user = await getAuthenticatedUser(workspaceId);
        return textContent({ user });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_repositories",
    {
      title: "GitHub List Repositories",
      description: integrationToolDescription(
        "GitHub",
        "List repositories for the authenticated user or configured org scope",
        "Omit owner to list repos for the PAT user. Set owner to org/user from dashboard org scope.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        type: z.enum(["all", "owner", "public", "private", "member"]).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListRepositoriesInputSchema.parse(args);
        const repositories = await listRepositories({ ...input, workspaceId });
        return textContent({ repositories });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_recent_commits",
    {
      title: "GitHub List Recent Commits",
      description: integrationToolDescription(
        "GitHub",
        "List recent commits across the authenticated user's GitHub activity",
        "PREFERRED for 'latest commits from my account'. Uses the dashboard PAT — never local git. Optionally filter by owner or single repo.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListRecentCommitsInputSchema.parse(args);
        const result = await listRecentCommits({ ...input, workspaceId });
        return textContent({
          commits: result.commits,
          count: result.commits.length,
          source: result.source,
          note:
            result.source === "repositories"
              ? "Fetched via per-repo commits API (works with standard repo-scoped PATs). /user/events is unavailable for many fine-grained tokens."
              : "Fetched via GitHub user events feed.",
        });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_issues",
    {
      title: "GitHub List Issues",
      description: integrationToolDescription("GitHub", "List issues for a repository"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
        labels: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListIssuesInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const issues = await listIssues({ ...input, owner, workspaceId });
        return textContent({ issues, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_pull_requests",
    {
      title: "GitHub List Pull Requests",
      description: integrationToolDescription("GitHub", "List pull requests for a repository"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        state: z.enum(["open", "closed", "all"]).optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListPullRequestsInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const pullRequests = await listPullRequests({ ...input, owner, workspaceId });
        return textContent({ pullRequests, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_list_commits",
    {
      title: "GitHub List Commits",
      description: integrationToolDescription(
        "GitHub",
        "List commits for a single repository branch or path",
        "For account-wide recent commits use github_list_recent_commits instead.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        sha: z.string().optional(),
        path: z.string().optional(),
        perPage: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubListCommitsInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const commits = await listCommits({ ...input, owner, workspaceId });
        return textContent({ commits, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_get_pull_request",
    {
      title: "GitHub Get Pull Request",
      description: integrationToolDescription("GitHub", "Fetch details for a single pull request"),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        pullNumber: z.number().int().min(1),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured or not enabled. Connect GitHub in the kube-memory dashboard." });
      }
      try {
        const input = githubGetPullRequestInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const pullRequest = await getPullRequest({ ...input, owner, workspaceId });
        return textContent({ pullRequest, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_create_branch",
    {
      title: "GitHub Create Branch",
      description: integrationToolDescription(
        "GitHub",
        "Create a new branch from default or specified ref",
        "Requires repo write scope on the workspace PAT.",
      ),
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        branch: z.string(),
        fromRef: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured." });
      }
      try {
        const input = githubCreateBranchInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const result = await createBranch({ ...input, owner, workspaceId });
        return textContent({ ...result, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_create_or_update_file",
    {
      title: "GitHub Create or Update File",
      description: integrationToolDescription(
        "GitHub",
        "Create or update a file in a repository branch",
        "Requires repo write scope on the workspace PAT.",
      ),
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        path: z.string(),
        content: z.string(),
        message: z.string(),
        branch: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured." });
      }
      try {
        const input = githubCreateOrUpdateFileInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const result = await createOrUpdateFile({ ...input, owner, workspaceId });
        return textContent({ ...result, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );

  server.registerTool(
    "github_create_pull_request",
    {
      title: "GitHub Create Pull Request",
      description: integrationToolDescription(
        "GitHub",
        "Open a pull request between head and base branches",
        "Used by kube_deploy for automated fix PRs. Requires repo write scope.",
      ),
      inputSchema: {
        owner: z.string().optional(),
        repo: z.string(),
        title: z.string(),
        body: z.string(),
        head: z.string(),
        base: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGitHubAvailable(workspaceId))) {
        return textContent({ error: "GitHub connector not configured." });
      }
      try {
        const input = githubCreatePullRequestInputSchema.parse(args);
        const owner = await resolveOwner(workspaceId, input.owner);
        const result = await createPullRequest({ ...input, owner, workspaceId });
        return textContent({ ...result, owner, repo: input.repo });
      } catch (err) {
        return connectorError("github", err);
      }
    },
  );
}
