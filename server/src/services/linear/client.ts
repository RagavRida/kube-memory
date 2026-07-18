import { connectorFetch, requireConnector } from "../connectors/connectorHttp.js";

const LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql";

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

const ISSUE_FIELDS = `
  id
  identifier
  title
  description
  priority
  url
  createdAt
  updatedAt
  state { id name type }
  assignee { id name email }
  team { id name key }
  project { id name }
`;

async function linearGraphql<T>(
  workspaceId: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await connectorFetch(workspaceId, "linear", LINEAR_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`linear API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await res.json()) as GraphQLResponse<T>;
  if (payload.errors?.length) {
    throw new Error(`linear GraphQL error: ${payload.errors[0]?.message ?? "unknown"}`);
  }
  if (!payload.data) {
    throw new Error("linear GraphQL returned no data");
  }
  return payload.data;
}

function parseIdentifier(identifier: string): { teamKey: string; number: number } | null {
  const match = /^([A-Za-z]+)-(\d+)$/.exec(identifier.trim());
  if (!match) return null;
  return { teamKey: match[1], number: Number(match[2]) };
}

export async function resolveDefaultTeam(workspaceId: string): Promise<string | undefined> {
  const { config } = await requireConnector(workspaceId, "linear");
  const teamId = String(config.teamId ?? "").trim();
  return teamId || undefined;
}

export async function listTeams(workspaceId: string): Promise<unknown[]> {
  const data = await linearGraphql<{ teams: { nodes: unknown[] } }>(
    workspaceId,
    `query {
      teams {
        nodes {
          id
          name
          key
          description
        }
      }
    }`,
  );
  return data.teams.nodes;
}

export async function listIssues(options: {
  workspaceId: string;
  teamId?: string;
  state?: string;
  assigneeId?: string;
  projectId?: string;
  first?: number;
}): Promise<unknown[]> {
  const teamId = options.teamId ?? (await resolveDefaultTeam(options.workspaceId));
  const first = options.first ?? 50;

  const filter: Record<string, unknown> = {};
  if (teamId) filter.team = { id: { eq: teamId } };
  if (options.state) filter.state = { type: { eq: options.state } };
  if (options.assigneeId) filter.assignee = { id: { eq: options.assigneeId } };
  if (options.projectId) filter.project = { id: { eq: options.projectId } };

  const data = await linearGraphql<{ issues: { nodes: unknown[] } }>(
    options.workspaceId,
    `query($first: Int!, $filter: IssueFilter) {
      issues(first: $first, filter: $filter) {
        nodes { ${ISSUE_FIELDS} }
      }
    }`,
    { first, filter: Object.keys(filter).length > 0 ? filter : undefined },
  );
  return data.issues.nodes;
}

export async function getIssue(options: {
  workspaceId: string;
  issueId: string;
}): Promise<unknown> {
  const id = options.issueId.trim();

  try {
    const byUuid = await linearGraphql<{ issue: unknown | null }>(
      options.workspaceId,
      `query($id: String!) {
        issue(id: $id) {
          ${ISSUE_FIELDS}
          labels { nodes { id name } }
        }
      }`,
      { id },
    );
    if (byUuid.issue) return byUuid.issue;
  } catch {
    // fall through to identifier lookup
  }

  const parsed = parseIdentifier(id);
  if (parsed) {
    const data = await linearGraphql<{ issues: { nodes: unknown[] } }>(
      options.workspaceId,
      `query($filter: IssueFilter!) {
        issues(filter: $filter, first: 1) {
          nodes {
            ${ISSUE_FIELDS}
            labels { nodes { id name } }
          }
        }
      }`,
      {
        filter: {
          and: [
            { team: { key: { eq: parsed.teamKey } } },
            { number: { eq: parsed.number } },
          ],
        },
      },
    );
    if (data.issues.nodes[0]) return data.issues.nodes[0];
  }

  throw new Error(`Linear issue not found: ${id}`);
}

export async function searchIssues(options: {
  workspaceId: string;
  query: string;
  teamId?: string;
  first?: number;
}): Promise<unknown[]> {
  const teamId = options.teamId ?? (await resolveDefaultTeam(options.workspaceId));
  const first = options.first ?? 25;
  const term = options.query.trim();

  const filter = teamId ? { team: { id: { eq: teamId } } } : undefined;

  const data = await linearGraphql<{ issueSearch: { nodes: unknown[] } }>(
    options.workspaceId,
    `query($term: String!, $first: Int!, $filter: IssueFilter) {
      issueSearch(query: $term, first: $first, filter: $filter) {
        nodes { ${ISSUE_FIELDS} }
      }
    }`,
    { term, first, filter },
  );
  return data.issueSearch.nodes;
}

export async function listProjects(options: {
  workspaceId: string;
  teamId?: string;
  first?: number;
}): Promise<unknown[]> {
  const teamId = options.teamId ?? (await resolveDefaultTeam(options.workspaceId));
  const first = options.first ?? 50;

  if (teamId) {
    const data = await linearGraphql<{ team: { projects: { nodes: unknown[] } } | null }>(
      options.workspaceId,
      `query($teamId: String!, $first: Int!) {
        team(id: $teamId) {
          projects(first: $first) {
            nodes {
              id
              name
              description
              state
              url
              startDate
              targetDate
            }
          }
        }
      }`,
      { teamId, first },
    );
    return data.team?.projects?.nodes ?? [];
  }

  const data = await linearGraphql<{ projects: { nodes: unknown[] } }>(
    options.workspaceId,
    `query($first: Int!) {
      projects(first: $first) {
        nodes {
          id
          name
          description
          state
          url
          startDate
          targetDate
        }
      }
    }`,
    { first },
  );
  return data.projects.nodes;
}

export async function isLinearAvailable(workspaceId: string): Promise<boolean> {
  try {
    await requireConnector(workspaceId, "linear");
    return true;
  } catch {
    return false;
  }
}
