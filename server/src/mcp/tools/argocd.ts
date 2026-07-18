import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  argocdGetApplicationInputSchema,
  argocdRollbackApplicationInputSchema,
  argocdSyncApplicationInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getApplication,
  getApplicationHistory,
  getApplicationResourceTree,
  isArgoCDAvailable,
  listApplicationEvents,
  listApplications,
  listProjects,
  listRepositories,
  rollbackApplication,
  syncApplication,
} from "../../services/argocd/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerArgoCDTools(server: McpServer): void {
  server.registerTool(
    "argocd_list_applications",
    {
      title: "ArgoCD List Applications",
      description: "List GitOps applications managed by ArgoCD (read-only). Requires ArgoCD connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const applications = await listApplications({ workspaceId });
        return textContent({ applications });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_get_application",
    {
      title: "ArgoCD Get Application",
      description: "Fetch sync/health status for an ArgoCD application (read-only). Requires ArgoCD connector.",
      inputSchema: {
        name: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdGetApplicationInputSchema.parse(args);
        const application = await getApplication({ ...input, workspaceId });
        return textContent({ application });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_get_app_history",
    {
      title: "ArgoCD Application History",
      description: "List deployment history for an ArgoCD application (read-only). Requires ArgoCD connector.",
      inputSchema: {
        name: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdGetApplicationInputSchema.parse(args);
        const history = await getApplicationHistory({ ...input, workspaceId });
        return textContent({ name: input.name, history });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_list_app_events",
    {
      title: "ArgoCD Application Events",
      description: "List sync and deploy events for an ArgoCD application (read-only). Requires ArgoCD connector.",
      inputSchema: {
        name: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdGetApplicationInputSchema.parse(args);
        const events = await listApplicationEvents({ ...input, workspaceId });
        return textContent({ name: input.name, events });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_get_app_resource_tree",
    {
      title: "ArgoCD Application Resource Tree",
      description: "Fetch the live resource tree for an ArgoCD application (read-only). Requires ArgoCD connector.",
      inputSchema: {
        name: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdGetApplicationInputSchema.parse(args);
        const resourceTree = await getApplicationResourceTree({ ...input, workspaceId });
        return textContent({ name: input.name, resourceTree });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_list_projects",
    {
      title: "ArgoCD List Projects",
      description: "List ArgoCD projects (read-only). Requires ArgoCD connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const projects = await listProjects({ workspaceId });
        return textContent({ projects });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_list_repositories",
    {
      title: "ArgoCD List Repositories",
      description: "List Git repositories connected to ArgoCD (read-only). Requires ArgoCD connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const repositories = await listRepositories({ workspaceId });
        return textContent({ repositories });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_sync_application",
    {
      title: "ArgoCD Sync Application",
      description: "Trigger a sync for an ArgoCD application. Requires ArgoCD connector and admin role.",
      inputSchema: {
        name: z.string(),
        revision: z.string().optional(),
        prune: z.boolean().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to sync ArgoCD applications" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdSyncApplicationInputSchema.parse(args);
        const result = await syncApplication({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );

  server.registerTool(
    "argocd_rollback_application",
    {
      title: "ArgoCD Rollback Application",
      description: "Rollback an ArgoCD application to a prior deployment. Requires ArgoCD connector and admin role.",
      inputSchema: {
        name: z.string(),
        id: z.number().int().min(0),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to rollback ArgoCD applications" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isArgoCDAvailable(workspaceId))) {
        return textContent({ error: "ArgoCD connector not configured. Connect ArgoCD in the dashboard." });
      }
      try {
        const input = argocdRollbackApplicationInputSchema.parse(args);
        const result = await rollbackApplication({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("argocd", err);
      }
    },
  );
}
