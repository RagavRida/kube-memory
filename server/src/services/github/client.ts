import { connectorJson, connectorJsonIfOk, requireConnector } from "../connectors/connectorHttp.js";
import { getEnv } from "../../config/env.js";

interface GitHubUser {
  login: string;
  name?: string;
  type?: string;
}

interface GitHubPushEvent {
  type?: string;
  repo?: { name?: string };
  actor?: { login?: string };
  payload?: { commits?: Array<Record<string, unknown>> };
}

export async function getAuthenticatedUser(workspaceId: string): Promise<GitHubUser> {
  return connectorJson<GitHubUser>(workspaceId, "github", "https://api.github.com/user");
}

export async function resolveDefaultOwner(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "github");
  const org = String(config.org ?? "").trim();
  return org || undefined;
}

export async function resolveOwner(
  workspaceId: string,
  owner?: string,
): Promise<string> {
  if (owner?.trim()) return owner.trim();
  const configured = await resolveDefaultOwner(workspaceId);
  if (configured) return configured;
  const user = await getAuthenticatedUser(workspaceId);
  return user.login;
}

export async function listIssues(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({
    state: options.state ?? "open",
    per_page: String(options.perPage ?? 30),
  });
  if (options.labels) params.set("labels", options.labels);

  const data = await connectorJson<unknown[]>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/issues?${params}`,
  );
  return data;
}

export async function listPullRequests(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({
    state: options.state ?? "open",
    per_page: String(options.perPage ?? 30),
  });

  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls?${params}`,
  );
}

export async function listCommits(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  sha?: string;
  path?: string;
  perPage?: number;
}): Promise<unknown[]> {
  const params = new URLSearchParams({ per_page: String(options.perPage ?? 30) });
  if (options.sha) params.set("sha", options.sha);
  if (options.path) params.set("path", options.path);

  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/commits?${params}`,
  );
}

export async function listRepositories(options: {
  workspaceId: string;
  owner?: string;
  type?: "all" | "owner" | "public" | "private" | "member";
  perPage?: number;
}): Promise<unknown[]> {
  const perPage = String(options.perPage ?? 30);
  const owner = options.owner?.trim();

  if (!owner) {
    const params = new URLSearchParams({
      per_page: perPage,
      sort: "updated",
      type: options.type ?? "owner",
    });
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/user/repos?${params}`,
    );
  }

  const user = await getAuthenticatedUser(options.workspaceId);
  if (owner === user.login) {
    const params = new URLSearchParams({
      per_page: perPage,
      sort: "updated",
      type: options.type ?? "owner",
    });
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/user/repos?${params}`,
    );
  }

  const params = new URLSearchParams({
    per_page: perPage,
    sort: "updated",
    type: options.type ?? "all",
  });

  try {
    return await connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/orgs/${encodeURIComponent(owner)}/repos?${params}`,
    );
  } catch {
    return connectorJson(
      options.workspaceId,
      "github",
      `https://api.github.com/users/${encodeURIComponent(owner)}/repos?${params}`,
    );
  }
}

export async function listRecentCommits(options: {
  workspaceId: string;
  owner?: string;
  repo?: string;
  perPage?: number;
}): Promise<{ commits: Array<Record<string, unknown>>; source: "events" | "repositories" }> {
  const limit = options.perPage ?? 30;

  if (options.repo) {
    const owner = await resolveOwner(options.workspaceId, options.owner);
    const commits = await listCommits({
      workspaceId: options.workspaceId,
      owner,
      repo: options.repo,
      perPage: limit,
    });
    return {
      source: "repositories",
      commits: commits.map((commit) => ({
        ...(commit as Record<string, unknown>),
        repository: `${owner}/${options.repo}`,
      })),
    };
  }

  const eventsResult = await connectorJsonIfOk<GitHubPushEvent[]>(
    options.workspaceId,
    "github",
    "https://api.github.com/user/events?per_page=100",
  );

  if (eventsResult.ok) {
    const commits: Array<Record<string, unknown>> = [];
    const ownerFilter = options.owner?.trim().toLowerCase();

    for (const event of eventsResult.data) {
      if (event.type !== "PushEvent") continue;

      const repoFullName = event.repo?.name ?? "";
      if (ownerFilter && !repoFullName.toLowerCase().startsWith(`${ownerFilter}/`)) {
        continue;
      }

      for (const commit of event.payload?.commits ?? []) {
        commits.push({
          ...commit,
          repository: repoFullName,
          pushedBy: event.actor?.login,
        });
        if (commits.length >= limit) {
          return { commits, source: "events" };
        }
      }
    }

    if (commits.length > 0) {
      return { commits, source: "events" };
    }
  }

  return listRecentCommitsFromRepositories(options, limit);
}

async function listRecentCommitsFromRepositories(
  options: { workspaceId: string; owner?: string; perPage?: number },
  limit: number,
): Promise<{ commits: Array<Record<string, unknown>>; source: "repositories" }> {
  const repos = await listRepositories({
    workspaceId: options.workspaceId,
    owner: options.owner,
    perPage: Math.min(limit, 15),
    type: "all",
  });

  const dated: Array<{ commit: Record<string, unknown>; repository: string; date: string }> = [];

  for (const repo of repos.slice(0, 10)) {
    const fullName = String((repo as { full_name?: string }).full_name ?? "");
    const slash = fullName.indexOf("/");
    if (slash < 0) continue;

    const owner = fullName.slice(0, slash);
    const repoName = fullName.slice(slash + 1);

    try {
      const commits = await listCommits({
        workspaceId: options.workspaceId,
        owner,
        repo: repoName,
        perPage: Math.min(5, limit),
      });

      for (const commit of commits) {
        const record = commit as {
          commit?: { author?: { date?: string }; message?: string };
          sha?: string;
        };
        dated.push({
          commit: commit as Record<string, unknown>,
          repository: fullName,
          date: record.commit?.author?.date ?? "",
        });
      }
    } catch {
      continue;
    }
  }

  dated.sort((a, b) => b.date.localeCompare(a.date));

  return {
    source: "repositories",
    commits: dated.slice(0, limit).map(({ commit, repository }) => ({
      ...commit,
      repository,
    })),
  };
}

export async function getPullRequest(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  pullNumber: number;
}): Promise<unknown> {
  return connectorJson(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls/${options.pullNumber}`,
  );
}

export async function isGitHubAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "github");
    return true;
  } catch {
    return false;
  }
}

export function resolvePaymentServiceRepo(): { owner?: string; repo?: string } {
  const env = getEnv();
  return {
    owner: env.PAYMENT_SERVICE_GITHUB_OWNER?.trim() || undefined,
    repo: env.PAYMENT_SERVICE_GITHUB_REPO?.trim() || undefined,
  };
}

export async function getDefaultBranch(options: {
  workspaceId: string;
  owner: string;
  repo: string;
}): Promise<string> {
  const data = await connectorJson<{ default_branch?: string }>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}`,
  );
  return data.default_branch ?? "main";
}

export async function getFileSha(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}): Promise<string | undefined> {
  const params = options.ref ? `?ref=${encodeURIComponent(options.ref)}` : "";
  try {
    const data = await connectorJson<{ sha?: string }>(
      options.workspaceId,
      "github",
      `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${encodeURIComponent(options.path)}${params}`,
    );
    return data.sha;
  } catch {
    return undefined;
  }
}

export async function createBranch(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  branch: string;
  fromRef?: string;
}): Promise<{ ref: string; sha: string }> {
  const baseRef = options.fromRef ?? (await getDefaultBranch(options));
  const refData = await connectorJson<{ object: { sha: string } }>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/git/ref/heads/${encodeURIComponent(baseRef)}`,
  );

  const sha = refData.object.sha;
  const data = await connectorJson<{ ref: string; object: { sha: string } }>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/git/refs`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${options.branch}`, sha }),
    },
  );

  return { ref: data.ref, sha: data.object.sha };
}

export async function createOrUpdateFile(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch: string;
}): Promise<{ sha: string; path: string }> {
  const existingSha = await getFileSha({
    workspaceId: options.workspaceId,
    owner: options.owner,
    repo: options.repo,
    path: options.path,
    ref: options.branch,
  });

  const body: Record<string, unknown> = {
    message: options.message,
    content: Buffer.from(options.content, "utf8").toString("base64"),
    branch: options.branch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const data = await connectorJson<{ content: { sha: string; path: string } }>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/contents/${encodeURIComponent(options.path)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return { sha: data.content.sha, path: data.content.path };
}

export async function createPullRequest(options: {
  workspaceId: string;
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base?: string;
}): Promise<{ number: number; html_url: string; title: string }> {
  const base = options.base ?? (await getDefaultBranch(options));
  const data = await connectorJson<{ number: number; html_url: string; title: string }>(
    options.workspaceId,
    "github",
    `https://api.github.com/repos/${encodeURIComponent(options.owner)}/${encodeURIComponent(options.repo)}/pulls`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.head,
        base,
      }),
    },
  );

  return { number: data.number, html_url: data.html_url, title: data.title };
}
