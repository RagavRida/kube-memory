import type { McpServer } from "@modelcontextprotocol/server";
import { connectorTypes } from "../../db/models/Connector.js";
import { requireAuthContext } from "../../context/requestContext.js";
import { getConnectorSecret } from "../../services/connectors/connectorSecrets.js";
import { getEnv } from "../../config/env.js";
import { MCP_SERVER_INSTRUCTIONS, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { textContent } from "../toolResult.js";

export function registerPlatformTools(server: McpServer): void {
  server.registerTool(
    "kube_memory_status",
    {
      title: "kube-memory Workspace Status",
      description:
        "List enabled integrations and workspace info for this MCP session. Call this when unsure which kube-memory tools are available. NEVER substitute local git/kubectl for missing connectors.",
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      const integrations: Record<string, { enabled: boolean; configured: boolean }> = {};
      for (const type of connectorTypes) {
        const connector = await getConnectorSecret(workspaceId, type);
        integrations[type] = {
          enabled: Boolean(connector),
          configured: Boolean(connector?.secret),
        };
      }

      const kubernetesFallback = Boolean(getEnv().KUBECONFIG_BASE64);

      return textContent({
        workspace: {
          name: auth.workspace.name,
          slug: auth.workspace.slug,
          cogneeDataset: auth.workspace.cogneeDataset,
        },
        role: auth.role,
        integrations,
        hints: {
          github: integrations.github?.enabled
            ? "Use github_list_recent_commits for account commits; github_list_commits for a single repo."
            : "Connect GitHub in the kube-memory dashboard.",
          kubernetes:
            integrations.kubernetes?.enabled || kubernetesFallback
              ? "Use k8s_apply_manifest, k8s_get_pod, k8s_delete_pod, k8s_pod_logs, and k8s_get_events."
              : "Connect Kubernetes in the kube-memory dashboard.",
          gcp: integrations.gcp?.enabled
            ? "Use gcp_list_instances and gcp_get_instance for Compute Engine VMs."
            : "Connect Google Cloud in the kube-memory dashboard.",
        },
        instructions: MCP_SERVER_INSTRUCTIONS,
      });
    },
  );
}
