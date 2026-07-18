import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  prometheusListLabelsInputSchema,
  prometheusListLabelValuesInputSchema,
  prometheusListRulesInputSchema,
  prometheusQueryInputSchema,
  prometheusQueryRangeInputSchema,
} from "../../schemas/mcp/toolInputs.js";
import {
  instantQuery,
  isPrometheusAvailable,
  listAlertmanagers,
  listAlerts,
  listLabels,
  listLabelValues,
  listRules,
  listTargets,
  rangeQuery,
} from "../../services/prometheus/client.js";

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function connectorError(type: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return textContent({ error: message, connector: type });
}

export function registerPrometheusTools(server: McpServer): void {
  server.registerTool(
    "prometheus_query",
    {
      title: "Prometheus Instant Query",
      description: "Run a PromQL instant query against Prometheus (read-only). Requires Prometheus connector.",
      inputSchema: {
        query: z.string(),
        time: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const input = prometheusQueryInputSchema.parse(args);
        const result = await instantQuery({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_query_range",
    {
      title: "Prometheus Range Query",
      description: "Run a PromQL range query against Prometheus (read-only). Requires Prometheus connector.",
      inputSchema: {
        query: z.string(),
        start: z.string(),
        end: z.string(),
        step: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const input = prometheusQueryRangeInputSchema.parse(args);
        const result = await rangeQuery({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_alerts",
    {
      title: "Prometheus Active Alerts",
      description: "List currently firing alerts from Prometheus (read-only). Requires Prometheus connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const result = await listAlerts({ workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_targets",
    {
      title: "Prometheus Scrape Targets",
      description: "List Prometheus scrape targets and their health (read-only). Requires Prometheus connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const result = await listTargets({ workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_rules",
    {
      title: "Prometheus Alert and Recording Rules",
      description: "List alerting and recording rules from Prometheus (read-only). Requires Prometheus connector.",
      inputSchema: {
        type: z.enum(["alert", "record"]).optional(),
        ruleName: z.array(z.string()).optional(),
        ruleGroup: z.array(z.string()).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const input = prometheusListRulesInputSchema.parse(args);
        const result = await listRules({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_alertmanagers",
    {
      title: "Prometheus Alertmanagers",
      description: "List active Alertmanager endpoints discovered by Prometheus (read-only). Requires Prometheus connector.",
      inputSchema: {},
    },
    async () => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const result = await listAlertmanagers({ workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_labels",
    {
      title: "Prometheus Label Names",
      description: "List metric label names for discovery (read-only). Requires Prometheus connector.",
      inputSchema: {
        match: z.array(z.string()).optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const input = prometheusListLabelsInputSchema.parse(args);
        const result = await listLabels({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );

  server.registerTool(
    "prometheus_list_label_values",
    {
      title: "Prometheus Label Values",
      description: "List values for a metric label (read-only). Requires Prometheus connector.",
      inputSchema: {
        labelName: z.string(),
        match: z.array(z.string()).optional(),
        start: z.string().optional(),
        end: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isPrometheusAvailable(workspaceId))) {
        return textContent({ error: "Prometheus connector not configured. Connect Prometheus in the dashboard." });
      }
      try {
        const input = prometheusListLabelValuesInputSchema.parse(args);
        const result = await listLabelValues({ ...input, workspaceId });
        return textContent({ result });
      } catch (err) {
        return connectorError("prometheus", err);
      }
    },
  );
}
