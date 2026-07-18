import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  linearGetIssueInputSchema,
  linearListIssuesInputSchema,
  linearListProjectsInputSchema,
  linearSearchIssuesInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getIssue,
  isLinearAvailable,
  listIssues,
  listProjects,
  listTeams,
  searchIssues,
} from "../../services/linear/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerLinearTools(server: McpServer): void {
  server.registerTool(
    "linear_list_teams",
    {
      title: "Linear List Teams",
      description: integrationToolDescription(
        "Linear",
        "List teams accessible to the configured API key",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isLinearAvailable(workspaceId))) {
        return textContent({
          error: "Linear connector not configured or not enabled. Connect Linear in the kube-memory dashboard.",
        });
      }
      try {
        const teams = await listTeams(workspaceId);
        return textContent({ teams });
      } catch (err) {
        return connectorError("linear", err);
      }
    },
  );

  server.registerTool(
    "linear_list_issues",
    {
      title: "Linear List Issues",
      description: integrationToolDescription(
        "Linear",
        "List issues filtered by team, state, assignee, or project",
        "Uses the configured default team when teamId is not provided",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        teamId: z.string().optional(),
        state: z.enum(["backlog", "unstarted", "started", "completed", "canceled"]).optional(),
        assigneeId: z.string().optional(),
        projectId: z.string().optional(),
        first: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isLinearAvailable(workspaceId))) {
        return textContent({
          error: "Linear connector not configured or not enabled. Connect Linear in the kube-memory dashboard.",
        });
      }
      try {
        const input = linearListIssuesInputSchema.parse(args);
        const issues = await listIssues({ workspaceId, ...input });
        return textContent({ issues });
      } catch (err) {
        return connectorError("linear", err);
      }
    },
  );

  server.registerTool(
    "linear_get_issue",
    {
      title: "Linear Get Issue",
      description: integrationToolDescription(
        "Linear",
        "Fetch a single issue by UUID or identifier (e.g. ENG-123)",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        issueId: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isLinearAvailable(workspaceId))) {
        return textContent({
          error: "Linear connector not configured or not enabled. Connect Linear in the kube-memory dashboard.",
        });
      }
      try {
        const input = linearGetIssueInputSchema.parse(args);
        const issue = await getIssue({ workspaceId, issueId: input.issueId });
        return textContent({ issue });
      } catch (err) {
        return connectorError("linear", err);
      }
    },
  );

  server.registerTool(
    "linear_search_issues",
    {
      title: "Linear Search Issues",
      description: integrationToolDescription(
        "Linear",
        "Full-text search across Linear issues",
        "Optionally scoped to the configured default team",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        query: z.string(),
        teamId: z.string().optional(),
        first: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isLinearAvailable(workspaceId))) {
        return textContent({
          error: "Linear connector not configured or not enabled. Connect Linear in the kube-memory dashboard.",
        });
      }
      try {
        const input = linearSearchIssuesInputSchema.parse(args);
        const issues = await searchIssues({ workspaceId, ...input });
        return textContent({ issues });
      } catch (err) {
        return connectorError("linear", err);
      }
    },
  );

  server.registerTool(
    "linear_list_projects",
    {
      title: "Linear List Projects",
      description: integrationToolDescription(
        "Linear",
        "List projects, optionally scoped to a team",
        "Uses the configured default team when teamId is not provided",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        teamId: z.string().optional(),
        first: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isLinearAvailable(workspaceId))) {
        return textContent({
          error: "Linear connector not configured or not enabled. Connect Linear in the kube-memory dashboard.",
        });
      }
      try {
        const input = linearListProjectsInputSchema.parse(args);
        const projects = await listProjects({ workspaceId, ...input });
        return textContent({ projects });
      } catch (err) {
        return connectorError("linear", err);
      }
    },
  );
}
