import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  kubeDeployInputSchema,
  replayImpactedTrafficInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import { runDeploy } from "../../services/deploy/runDeploy.js";
import { replayImpactedTraffic } from "../../services/deploy/replayTraffic.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerDeployTools(server: McpServer): void {
  server.registerTool(
    "kube_deploy",
    {
      title: "Kube Deploy — full deploy and incident loop",
      description:
        "One-shot deploy workflow: scan manifest, predict risk, apply, monitor up to 5 minutes, " +
        "and on failure run mitigation, incident_open, fix PR, traffic replay, and resolution. Requires admin role.",
      inputSchema: {
        manifest: z.string(),
        stableManifest: z.string().optional(),
        namespace: z.string().optional(),
        serviceName: z.string().optional(),
        podName: z.string().optional(),
        githubOwner: z.string().optional(),
        githubRepo: z.string().optional(),
        slackChannel: z.string().optional(),
        triggerPagerDuty: z.boolean().optional(),
        pagerDutyServiceId: z.string().optional(),
        watchDurationSec: z.number().int().min(30).max(600).optional(),
        pollIntervalSec: z.number().int().min(5).max(60).optional(),
        argocdApplication: z.string().optional(),
        dryRun: z.boolean().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required for kube_deploy" });
      }

      try {
        const input = kubeDeployInputSchema.parse(args);
        const result = await runDeploy(
          { workspaceId: auth.workspace._id, datasetName: auth.workspace.cogneeDataset },
          input,
        );
        return textContent(result);
      } catch (err) {
        return connectorError("kube_deploy", err);
      }
    },
  );

  server.registerTool(
    "replay_impacted_traffic",
    {
      title: "Replay Impacted Traffic",
      description:
        "Detect impacted applications from Prometheus alerts and replay HTTP health/order requests against stable services via in-cluster curl Job. Requires admin role.",
      inputSchema: {
        namespace: z.string(),
        requestsPerService: z.number().int().min(1).max(10).optional(),
        services: z
          .array(
            z.object({
              name: z.string(),
              port: z.number().int(),
              healthPath: z.string().optional(),
              orderPath: z.string().optional(),
            }),
          )
          .optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required for replay_impacted_traffic" });
      }

      try {
        const input = replayImpactedTrafficInputSchema.parse(args);
        const result = await replayImpactedTraffic({
          workspaceId: auth.workspace._id.toString(),
          namespace: input.namespace,
          requestsPerService: input.requestsPerService,
          services: input.services?.map((s) => ({ ...s, namespace: input.namespace })),
        });
        return textContent(result);
      } catch (err) {
        return connectorError("replay_impacted_traffic", err);
      }
    },
  );
}
