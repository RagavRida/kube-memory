import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { requireAuthContext } from "../../context/requestContext.js";
import {
  gcpGetInstanceInputSchema,
  gcpListInstancesInputSchema,
  gcpListStorageBucketsInputSchema,
  gcpGetStorageBucketInputSchema,
  gcpListBucketObjectsInputSchema,
  gcpQueryLogsInputSchema,
  gcpListMetricDescriptorsInputSchema,
  gcpQueryMetricsInputSchema
} from "../../schemas/mcp/toolInputs.js";
import {
  getInstance,
  isGcpAvailable,
  listInstances,
  listStorageBuckets,
  getStorageBucket,
  listBucketObjects,
  queryLogs,
  listMetricDescriptors,
  queryMetrics,
} from "../../services/gcp/client.js";
import { integrationToolDescription, READ_ONLY_ANNOTATIONS } from "../constants.js";
import { connectorError, textContent } from "../toolResult.js";

export function registerGcpTools(server: McpServer): void {
  server.registerTool(
    "gcp_list_instances",
    {
      title: "GCP List Compute Instances",
      description: integrationToolDescription(
        "Google Cloud",
        "List Compute Engine VM instances",
        "Uses OAuth credentials from the dashboard. NEVER use local gcloud commands.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),
        zone: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpListInstancesInputSchema.parse(args);
        const result = await listInstances({ workspaceId, ...input });
        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_get_instance",
    {
      title: "GCP Get Compute Instance",
      description: integrationToolDescription(
        "Google Cloud",
        "Get details for a single Compute Engine VM instance",
        "Requires zone and instance name. NEVER use local gcloud commands.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),
        zone: z.string(),
        instance: z.string(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpGetInstanceInputSchema.parse(args);
        const result = await getInstance({ workspaceId, ...input });
        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_list_storage_buckets",
    {
      title: "GCP List Storage Buckets",
      description: integrationToolDescription(
        "Google Cloud",
        "List Cloud Storage buckets",
        "Uses OAuth credentials from the dashboard. NEVER use gsutil or gcloud commands.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpListStorageBucketsInputSchema.parse(args);
        const result = await listStorageBuckets({ 
          workspaceId,
           ...input 
        });
        return textContent({
          result 
        });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_get_storage_bucket",
    {
      title: "GCP Get Storage Bucket",
      description: integrationToolDescription(
        "Google Cloud",
        "Get metadata for a single Cloud Storage bucket",
        "Uses OAuth credentials from the dashboard. NEVER use gsutil or gcloud commands.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        // project: z.string().optional(),
        bucket: z.string()
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();
      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error: "Google Cloud connector not configured. Connect Google Cloud in the kube-memory dashboard.",
        });
      }
      try {
        const input = gcpGetStorageBucketInputSchema.parse(args);
        const result = await getStorageBucket({ 
          workspaceId, 
          ...input 
        });
        return textContent({ 
          result 
        });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_list_bucket_objects",
    {
      title: "GCP List Bucket Objects",
      description: integrationToolDescription(
        "Google Cloud",
        "List objects stored in a Cloud Storage bucket",
        "Supports optional prefix filtering.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        bucket: z.string(),
        prefix: z.string().optional(),
        maxResults: z.number().int().min(1).max(1000).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error:
            "Google Cloud connector not configured or not enabled. Connect Google Cloud in the kube-memory dashboard.",
        });
      }

      try {
        const input = gcpListBucketObjectsInputSchema.parse(args);

        const result = await listBucketObjects({
          workspaceId,
          ...input,
        });

        return textContent({
          result,
        });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_query_logs",
    {
      title: "GCP Query Cloud Logs",
      description: integrationToolDescription(
        "Google Cloud",
        "Query Cloud Logging entries",
        "Search Cloud Logging by severity, resource type, time range or text. Uses dashboard OAuth credentials. NEVER use local gcloud logging commands.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),

        severity: z
          .enum([
            "DEFAULT",
            "DEBUG",
            "INFO",
            "NOTICE",
            "WARNING",
            "ERROR",
            "CRITICAL",
            "ALERT",
            "EMERGENCY",
          ])
          .optional(),

        resourceType: z.string().optional(),

        search: z.string().optional(),

        from: z.string().optional(),

        to: z.string().optional(),

        pageSize: z.number().int().min(1).max(100).optional(),

        order: z.enum(["asc", "desc"]).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error:
            "Google Cloud connector not configured or not enabled. Connect Google Cloud in the kube-memory dashboard.",
        });
      }

      try {
        const input = gcpQueryLogsInputSchema.parse(args);

        const result = await queryLogs({
          workspaceId,
          ...input,
        });

        return textContent({
          result,
        });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_list_metric_descriptors",
    {
      title: "GCP List Metric Descriptors",
      description: integrationToolDescription(
        "Google Cloud",
        "List available Cloud Monitoring metric descriptors",
        "Useful for discovering metrics before querying them.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),
        filter: z.string().optional(),
        pageSize: z.number().int().min(1).max(1000).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error:
            "Google Cloud connector not configured or not enabled. Connect Google Cloud in the kube-memory dashboard.",
        });
      }

      try {
        const input =
          gcpListMetricDescriptorsInputSchema.parse(args);

        const result =
          await listMetricDescriptors({
            workspaceId,
            ...input,
          });

        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );

  server.registerTool(
    "gcp_query_metrics",
    {
      title: "GCP Query Metrics",
      description: integrationToolDescription(
        "Google Cloud",
        "Query Cloud Monitoring metrics",
        "Retrieve Cloud Monitoring time series for a metric.",
      ),
      annotations: READ_ONLY_ANNOTATIONS,
      inputSchema: {
        project: z.string().optional(),
        metricType: z.string(),
        resourceType: z.string().optional(),
        minutes: z.number().int().min(1).max(10080).optional(),
        pageSize: z.number().int().min(1).max(1000).optional(),
      },
    },
    async (args: Record<string, unknown>) => {
      const auth = requireAuthContext();
      const workspaceId = auth.workspace._id.toString();

      if (!(await isGcpAvailable(workspaceId))) {
        return textContent({
          error:
            "Google Cloud connector not configured or not enabled. Connect Google Cloud in the kube-memory dashboard.",
        });
      }

      try {
        const input =
          gcpQueryMetricsInputSchema.parse(args);

        const result = await queryMetrics({
          workspaceId,
          ...input,
        });

        return textContent({ result });
      } catch (err) {
        return connectorError("gcp", err);
      }
    },
  );
}
