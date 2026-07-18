import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  pagerdutyGetIncidentInputSchema,
  pagerdutyGetIncidentLogEntriesInputSchema,
  pagerdutyListIncidentNotesInputSchema,
  pagerdutyListIncidentsInputSchema,
  pagerdutyListOncallsInputSchema,
  pagerdutyListUsersInputSchema,
  pagerdutyCreateIncidentInputSchema,
  pagerdutyAddIncidentNoteInputSchema,
  pagerdutyResolveIncidentInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  createIncident,
  getIncident,
  isPagerDutyAvailable,
  listIncidentLogEntries,
  listIncidentNotes,
  listIncidents,
  listOncalls,
  listServices,
  listUsers,
  addIncidentNote,
  resolveIncident,
} from "../../services/pagerduty/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerPagerDutyTools(server: McpServer): void {
  server.registerTool(
    "pagerduty_list_incidents",
    {
      title: "PagerDuty List Incidents",
      description: "List PagerDuty incidents by status, service, or time range (read-only). Requires PagerDuty connector.",
      inputSchema: {
        statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).optional(),
        serviceIds: z.array(z.string()).optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        sortBy: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyListIncidentsInputSchema.parse(args);
        const incidents = await listIncidents({ ...input, workspaceId });
        return textContent({ incidents });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_get_incident",
    {
      title: "PagerDuty Get Incident",
      description: "Fetch details for a single PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyGetIncidentInputSchema.parse(args);
        const incident = await getIncident({ ...input, workspaceId });
        return textContent({ incident });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_services",
    {
      title: "PagerDuty List Services",
      description: "List PagerDuty services in the account (read-only). Requires PagerDuty connector.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const limit = typeof args.limit === "number" ? args.limit : 25;
        const services = await listServices({ workspaceId, limit });
        return textContent({ services });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_get_incident_log_entries",
    {
      title: "PagerDuty Incident Log Entries",
      description: "Fetch timeline log entries for a PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyGetIncidentLogEntriesInputSchema.parse(args);
        const logEntries = await listIncidentLogEntries({ ...input, workspaceId });
        return textContent({ logEntries });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_incident_notes",
    {
      title: "PagerDuty Incident Notes",
      description: "List notes on a PagerDuty incident (read-only). Requires PagerDuty connector.",
      inputSchema: {
        incidentId: z.string(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyListIncidentNotesInputSchema.parse(args);
        const notes = await listIncidentNotes({ ...input, workspaceId });
        return textContent({ notes });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_oncalls",
    {
      title: "PagerDuty List Oncalls",
      description: "List who is currently on call (read-only). Requires PagerDuty connector.",
      inputSchema: {
        scheduleIds: z.array(z.string()).optional(),
        userIds: z.array(z.string()).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyListOncallsInputSchema.parse(args);
        const oncalls = await listOncalls({ ...input, workspaceId });
        return textContent({ oncalls });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_list_users",
    {
      title: "PagerDuty List Users",
      description: "List users in the PagerDuty account (read-only). Requires PagerDuty connector.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyListUsersInputSchema.parse(args);
        const users = await listUsers({ ...input, workspaceId });
        return textContent({ users });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_create_incident",
    {
      title: "PagerDuty Create Incident",
      description:
        "Create a PagerDuty incident on a service. Requires PagerDuty connector and admin role.",
      inputSchema: {
        title: z.string(),
        serviceId: z.string(),
        body: z.string().optional(),
        urgency: z.enum(["high", "low"]).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required to create PagerDuty incidents" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured. Connect PagerDuty in the dashboard." });
      }
      try {
        const input = pagerdutyCreateIncidentInputSchema.parse(args);
        const incident = await createIncident({ ...input, workspaceId });
        return textContent({ incident });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_add_incident_note",
    {
      title: "PagerDuty Add Incident Note",
      description: "Add a note to a PagerDuty incident. Requires admin role.",
      inputSchema: {
        incidentId: z.string(),
        content: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured." });
      }
      try {
        const input = pagerdutyAddIncidentNoteInputSchema.parse(args);
        const note = await addIncidentNote({ workspaceId, ...input });
        return textContent({ note });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );

  server.registerTool(
    "pagerduty_resolve_incident",
    {
      title: "PagerDuty Resolve Incident",
      description: "Resolve a PagerDuty incident. Requires admin role.",
      inputSchema: {
        incidentId: z.string(),
        resolution: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      if (auth.role !== "admin") {
        return textContent({ error: "Admin role required" });
      }
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPagerDutyAvailable(workspaceId))) {
        return textContent({ error: "PagerDuty connector not configured." });
      }
      try {
        const input = pagerdutyResolveIncidentInputSchema.parse(args);
        await resolveIncident({ workspaceId, ...input });
        return textContent({ resolved: true, incidentId: input.incidentId });
      } catch (err) {
        return connectorError("pagerduty", err);
      }
    },
  );
}
