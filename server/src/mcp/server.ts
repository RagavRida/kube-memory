import { McpServer } from "@modelcontextprotocol/server";
import { MCP_SERVER_INSTRUCTIONS } from "./constants.js";
import { registerMemoryTools } from "./tools/memory.js";
import { registerKubernetesTools } from "./tools/kubernetes.js";
import { registerGitHubTools } from "./tools/github.js";
import { registerSlackTools } from "./tools/slack.js";
import { registerPagerDutyTools } from "./tools/pagerduty.js";
import { registerPrometheusTools } from "./tools/prometheus.js";
import { registerArgoCDTools } from "./tools/argocd.js";
import { registerGcpTools } from "./tools/gcp.js";
import { registerLinearTools } from "./tools/linear.js";
import { registerNotionTools } from "./tools/notion.js";
import { registerIncidentTools } from "./tools/incident.js";
import { registerDeployTools } from "./tools/deploy.js";
import { registerPlatformTools } from "./tools/platform.js";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "kube-memory",
      version: "0.1.0",
    },
    {
      instructions: MCP_SERVER_INSTRUCTIONS,
    },
  );

  registerPlatformTools(server);
  registerMemoryTools(server);
  registerKubernetesTools(server);
  registerGitHubTools(server);
  registerSlackTools(server);
  registerPagerDutyTools(server);
  registerPrometheusTools(server);
  registerArgoCDTools(server);
  registerGcpTools(server);
  registerLinearTools(server);
  registerNotionTools(server);
  registerIncidentTools(server);
  registerDeployTools(server);

  return server;
}
