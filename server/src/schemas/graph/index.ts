import { z } from "zod";

export const failureCategories = [
  "Resource Limit",
  "Configuration Error",
  "Dependency Failure",
  "Network / DNS",
  "CrashLoop / App Exception",
  "Timeout / Latency",
  "Permission / Auth",
  "CI/CD Pipeline",
  "Cluster Issues",
  "Agent Error",
  "Unknown",
] as const;

export type FailureCategory = (typeof failureCategories)[number];

export const failureCategorySchema = z.enum(failureCategories);

export const serviceCriticalitySchema = z.enum(["low", "medium", "high", "critical"]);

export const serviceSchema = z.object({
  name: z.string().min(1),
  team: z.string().optional(),
  criticality: serviceCriticalitySchema.default("medium"),
});

export type Service = z.infer<typeof serviceSchema>;

export const deploymentSchema = z.object({
  timestamp: z.string().datetime({ offset: true }).or(z.string().min(1)),
  imageTag: z.string().optional(),
  cluster: z.string().optional(),
  namespace: z.string().optional(),
});

export type Deployment = z.infer<typeof deploymentSchema>;

export const incidentStatusSchema = z.enum(["open", "resolved", "escalated"]);

export const incidentSchema = z.object({
  time: z.string().datetime({ offset: true }).or(z.string().min(1)),
  severity: z.string().optional(),
  status: incidentStatusSchema.default("open"),
});

export type Incident = z.infer<typeof incidentSchema>;

export const rootCauseSchema = z.object({
  category: failureCategorySchema,
  description: z.string().min(1),
});

export type RootCause = z.infer<typeof rootCauseSchema>;

export const fixActionTypeSchema = z.enum([
  "rollback",
  "patch",
  "config-change",
  "scale-up",
  "restart",
  "other",
]);

export const fixActionSchema = z.object({
  type: fixActionTypeSchema,
  description: z.string().min(1),
  appliedAt: z.string().datetime({ offset: true }).or(z.string().min(1)).optional(),
});

export type FixAction = z.infer<typeof fixActionSchema>;

export const personSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.string().optional(),
});

export type Person = z.infer<typeof personSchema>;

export const commitSchema = z.object({
  sha: z.string().min(7),
  message: z.string().optional(),
  author: z.string().optional(),
  repository: z.string().optional(),
});

export type Commit = z.infer<typeof commitSchema>;

export const configurationSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  environment: z.string().optional(),
});

export type Configuration = z.infer<typeof configurationSchema>;

export const errorLogSnippetSchema = z.object({
  source: z.string().optional(),
  snippet: z.string().min(1),
  timestamp: z.string().optional(),
});

export type ErrorLogSnippet = z.infer<typeof errorLogSnippetSchema>;

export const metricsObservationSchema = z.object({
  metric: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  observedAt: z.string().optional(),
});

export type MetricsObservation = z.infer<typeof metricsObservationSchema>;

export const graphRelationTypes = [
  "Service-hasDeployment-Deployment",
  "Deployment-hasIncident-Incident",
  "Incident-hasRootCause-RootCause",
  "Incident-resolvedBy-FixAction",
  "Person-appliedFix-FixAction",
  "Commit-triggered-Deployment",
  "ErrorLogSnippet-indicates-RootCause",
  "FixAction-basedOn-RootCause",
] as const;

export const graphRelationSchema = z.enum(graphRelationTypes);

export type GraphRelation = z.infer<typeof graphRelationSchema>;

export const memoryEpisodeSchema = z.object({
  entity: z.literal("Incident"),
  service: serviceSchema,
  deployment: deploymentSchema.optional(),
  incident: incidentSchema,
  rootCause: rootCauseSchema.optional(),
  fixAction: fixActionSchema.optional(),
  person: personSchema.optional(),
  commit: commitSchema.optional(),
  configuration: configurationSchema.optional(),
  errorLogSnippet: errorLogSnippetSchema.optional(),
  metricsObservation: metricsObservationSchema.optional(),
  relations: z.array(graphRelationSchema).default([]),
  rawText: z.string().optional(),
});

export type MemoryEpisode = z.infer<typeof memoryEpisodeSchema>;

export function serializeEpisodeForCognee(episode: MemoryEpisode): string {
  const lines = [
    `DevOps memory episode for service ${episode.service.name}.`,
    `Incident status: ${episode.incident.status}. Time: ${episode.incident.time}.`,
  ];

  if (episode.incident.severity) {
    lines.push(`Severity: ${episode.incident.severity}.`);
  }
  if (episode.deployment) {
    lines.push(
      `Deployment namespace=${episode.deployment.namespace ?? "unknown"} tag=${episode.deployment.imageTag ?? "unknown"}.`,
    );
  }
  if (episode.rootCause) {
    lines.push(
      `Root cause [${episode.rootCause.category}]: ${episode.rootCause.description}.`,
    );
  }
  if (episode.fixAction) {
    lines.push(
      `Fix [${episode.fixAction.type}]: ${episode.fixAction.description}.`,
    );
  }
  if (episode.errorLogSnippet) {
    lines.push(`Log snippet: ${episode.errorLogSnippet.snippet.slice(0, 500)}.`);
  }

  lines.push(`Structured JSON: ${JSON.stringify(episode)}`);
  return lines.join("\n");
}
