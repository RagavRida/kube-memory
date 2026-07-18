import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  incidentGetInputSchema,
  incidentListInputSchema,
  incidentOpenInputSchema,
  incidentUpdateInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  getIncidentById,
  listIncidents,
  openIncident,
  updateIncident,
} from "../../services/incident/openIncident.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerIncidentTools(server: McpServer): void {
  server.registerTool(
    "incident_open",
    {
      title: "Open Operational Incident",
      description:
        "End-to-end incident workflow: enrich from Kubernetes, GitHub, Prometheus, and ArgoCD; " +
        "classify root cause; persist incident record; store memory episode; optionally trigger PagerDuty and post to Slack.",
      inputSchema: {
        serviceName: z.string(),
        namespace: z.string().optional(),
        podName: z.string().optional(),
        title: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        githubOwner: z.string().optional(),
        githubRepo: z.string().optional(),
        argocdApplication: z.string().optional(),
        prometheusQuery: z.string().optional(),
        notifySlack: z.boolean().optional(),
        slackChannel: z.string().optional(),
        triggerPagerDuty: z.boolean().optional(),
        pagerDutyServiceId: z.string().optional(),
        rememberInMemory: z.boolean().optional(),
        onCallTeam: z.string().optional(),
        impactedServices: z.array(z.string()).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to open incidents" });
      }

      try {
        const input = incidentOpenInputSchema.parse(args);
        const result = await openIncident(
          {
            workspaceId: auth.workspace._id,
            datasetName: auth.workspace.cogneeDataset,
          },
          input,
        );
        return textContent(result);
      } catch (err) {
        return connectorError("incident", err);
      }
    },
  );

  server.registerTool(
    "incident_get",
    {
      title: "Get Incident",
      description: "Fetch a persisted operational incident by ID.",
      inputSchema: {
        incidentId: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      try {
        const input = incidentGetInputSchema.parse(args);
        const incident = await getIncidentById(auth.workspace._id, input.incidentId);
        if (!incident) {
          return textContent({ error: "Incident not found" });
        }
        return textContent({ incident });
      } catch (err) {
        return connectorError("incident", err);
      }
    },
  );

  server.registerTool(
    "incident_list",
    {
      title: "List Incidents",
      description: "List recent operational incidents for this workspace.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      try {
        const input = incidentListInputSchema.parse(args);
        const incidents = await listIncidents(auth.workspace._id, input.limit);
        return textContent({ incidents });
      } catch (err) {
        return connectorError("incident", err);
      }
    },
  );

  server.registerTool(
    "incident_update",
    {
      title: "Update Incident",
      description: "Update incident status and optionally notify Slack.",
      inputSchema: {
        incidentId: z.string(),
        status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
        note: z.string().optional(),
        fixPrUrl: z.string().optional(),
        notifySlack: z.boolean().optional(),
        slackChannel: z.string().optional(),
        rememberResolution: z.boolean().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to update incidents" });
      }

      try {
        const input = incidentUpdateInputSchema.parse(args);
        const incident = await updateIncident(
          { workspaceId: auth.workspace._id, datasetName: auth.workspace.cogneeDataset },
          input.incidentId,
          input,
        );
        return textContent({ incident });
      } catch (err) {
        return connectorError("incident", err);
      }
    },
  );
}
