import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  notionGetPageInputSchema,
  notionListDatabasesInputSchema,
  notionQueryDatabaseInputSchema,
  notionSearchInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getPage,
  isNotionAvailable,
  listDatabases,
  queryDatabase,
  search,
} from "../../services/notion/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerNotionTools(server: McpServer): void {
  server.registerTool(
    "notion_search",
    {
      title: "Notion Search",
      description: integrationToolDescription(
        "Notion",
        "Search pages and databases shared with the integration",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        query: z.string().optional(),
        filter: z.enum(["page", "database"]).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isNotionAvailable(workspaceId))) {
        return textContent({
          error: "Notion connector not configured or not enabled. Connect Notion in the kube-memory dashboard.",
        });
      }
      try {
        const input = notionSearchInputSchema.parse(args);
        const results = await search({ workspaceId, ...input });
        return textContent(results);
      } catch (err) {
        return connectorError("notion", err);
      }
    },
  );

  server.registerTool(
    "notion_get_page",
    {
      title: "Notion Get Page",
      description: integrationToolDescription(
        "Notion",
        "Fetch a Notion page by ID, optionally including block children",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        pageId: z.string(),
        includeBlocks: z.boolean().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isNotionAvailable(workspaceId))) {
        return textContent({
          error: "Notion connector not configured or not enabled. Connect Notion in the kube-memory dashboard.",
        });
      }
      try {
        const input = notionGetPageInputSchema.parse(args);
        const result = await getPage({ workspaceId, ...input });
        return textContent(result);
      } catch (err) {
        return connectorError("notion", err);
      }
    },
  );

  server.registerTool(
    "notion_list_databases",
    {
      title: "Notion List Databases",
      description: integrationToolDescription(
        "Notion",
        "List databases shared with the integration",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        query: z.string().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isNotionAvailable(workspaceId))) {
        return textContent({
          error: "Notion connector not configured or not enabled. Connect Notion in the kube-memory dashboard.",
        });
      }
      try {
        const input = notionListDatabasesInputSchema.parse(args);
        const results = await listDatabases({ workspaceId, ...input });
        return textContent(results);
      } catch (err) {
        return connectorError("notion", err);
      }
    },
  );

  server.registerTool(
    "notion_query_database",
    {
      title: "Notion Query Database",
      description: integrationToolDescription(
        "Notion",
        "Query a Notion database with optional filter and sort",
        "Uses the configured default database when databaseId is not provided",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        databaseId: z.string().optional(),
        filter: z.record(z.string(), z.unknown()).optional(),
        sorts: z.array(z.record(z.string(), z.unknown())).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isNotionAvailable(workspaceId))) {
        return textContent({
          error: "Notion connector not configured or not enabled. Connect Notion in the kube-memory dashboard.",
        });
      }
      try {
        const input = notionQueryDatabaseInputSchema.parse(args);
        const results = await queryDatabase({ workspaceId, ...input });
        return textContent(results);
      } catch (err) {
        return connectorError("notion", err);
      }
    },
  );
}
