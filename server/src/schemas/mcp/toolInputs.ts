import { z } from "zod";
import { memoryEpisodeSchema } from "../graph/index.js";

export const memoryRememberInputSchema = z.object({
  episode: memoryEpisodeSchema.optional(),
  text: z.string().min(1).optional(),
  datasetName: z.string().min(1).optional(),
}).refine((v) => v.episode !== undefined || v.text !== undefined, {
  message: "Either episode or text is required",
});

export const memoryRecallInputSchema = z.object({
  query: z.string().min(1),
  datasetName: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(100).default(10),
  sessionId: z.string().optional(),
});

export const memoryForgetInputSchema = z.object({
  datasetName: z.string().min(1).optional(),
  everything: z.boolean().default(false),
});

export const predictRiskInputSchema = z.object({
  serviceName: z.string().min(1),
  query: z.string().optional(),
  datasetName: z.string().min(1).optional(),
});

export const k8sPodLogsInputSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().optional(),
  container: z.string().optional(),
  tail: z.number().int().min(1).max(500).default(100),
});

export const k8sGetEventsInputSchema = z.object({
  namespace: z.string().optional(),
  fieldSelector: z.string().optional(),
});

export const k8sApplyManifestInputSchema = z.object({
  manifest: z.string().min(1),
  namespace: z.string().optional(),
  dryRun: z.boolean().optional(),
});

export const k8sGetPodInputSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().optional(),
});

export const k8sDeletePodInputSchema = z.object({
  name: z.string().min(1),
  namespace: z.string().optional(),
});

export const githubListIssuesInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).default("open"),
  labels: z.string().optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListPullRequestsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "all"]).default("open"),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListCommitsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  sha: z.string().optional(),
  path: z.string().optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubGetPullRequestInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1),
  pullNumber: z.number().int().min(1),
});

export const githubListRepositoriesInputSchema = z.object({
  owner: z.string().min(1).optional(),
  type: z.enum(["all", "owner", "public", "private", "member"]).default("owner"),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const githubListRecentCommitsInputSchema = z.object({
  owner: z.string().min(1).optional(),
  repo: z.string().min(1).optional(),
  perPage: z.number().int().min(1).max(100).default(30),
});

export const slackGetHistoryInputSchema = z.object({
  channel: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(200).default(50),
  oldest: z.string().optional(),
});

export const slackPostMessageInputSchema = z.object({
  channel: z.string().min(1).optional(),
  text: z.string().min(1),
  threadTs: z.string().optional(),
});

export const slackListChannelsInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(100),
});

export const slackGetChannelInfoInputSchema = z.object({
  channel: z.string(),
})

export const slackGetRepliesInputSchema = z.object({
  channel: z.string(),
  threadTs: z.string().optional(), // Optional to be removed in the future, as it will be required to fetch replies for a specific thread 
  limit: z.number().int().min(1).max(200).optional(),
})

export const slackListUsersInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(), 
})

export const pagerdutyListIncidentsInputSchema = z.object({
  statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).optional(),
  serviceIds: z.array(z.string()).optional(),
  since: z.string().optional(),
  until: z.string().optional(),
  sortBy: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyGetIncidentInputSchema = z.object({
  incidentId: z.string().min(1),
});

export const pagerdutyGetIncidentLogEntriesInputSchema = z.object({
  incidentId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListIncidentNotesInputSchema = z.object({
  incidentId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListOncallsInputSchema = z.object({
  scheduleIds: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export const pagerdutyListUsersInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
});

export const prometheusQueryInputSchema = z.object({
  query: z.string().min(1),
  time: z.string().optional(),
});

export const prometheusQueryRangeInputSchema = z.object({
  query: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
  step: z.string().default("60s"),
});

export const prometheusListRulesInputSchema = z.object({
  type: z.enum(["alert", "record"]).optional(),
  ruleName: z.array(z.string()).optional(),
  ruleGroup: z.array(z.string()).optional(),
});

export const prometheusListLabelsInputSchema = z.object({
  match: z.array(z.string()).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const prometheusListLabelValuesInputSchema = z.object({
  labelName: z.string().min(1),
  match: z.array(z.string()).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const argocdGetApplicationInputSchema = z.object({
  name: z.string().min(1),
});

export const argocdSyncApplicationInputSchema = z.object({
  name: z.string().min(1),
  revision: z.string().optional(),
  prune: z.boolean().default(false),
});

export const argocdRollbackApplicationInputSchema = z.object({
  name: z.string().min(1),
  id: z.number().int().min(0),
});

export const incidentOpenInputSchema = z.object({
  serviceName: z.string().min(1),
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
});

export const incidentGetInputSchema = z.object({
  incidentId: z.string().min(1),
});

export const incidentListInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
});

export const incidentUpdateInputSchema = z.object({
  incidentId: z.string().min(1),
  status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
  note: z.string().optional(),
  fixPrUrl: z.string().optional(),
  notifySlack: z.boolean().optional(),
  slackChannel: z.string().optional(),
  rememberResolution: z.boolean().optional(),
});

export const pagerdutyCreateIncidentInputSchema = z.object({
  title: z.string().min(1),
  serviceId: z.string().min(1),
  body: z.string().optional(),
  urgency: z.enum(["high", "low"]).optional(),
});

export const pagerdutyAddIncidentNoteInputSchema = z.object({
  incidentId: z.string().min(1),
  content: z.string().min(1),
});

export const pagerdutyResolveIncidentInputSchema = z.object({
  incidentId: z.string().min(1),
  resolution: z.string().optional(),
});

export const githubCreateBranchInputSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().min(1),
  branch: z.string().min(1),
  fromRef: z.string().optional(),
});

export const githubCreateOrUpdateFileInputSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().min(1),
  path: z.string().min(1),
  content: z.string().min(1),
  message: z.string().min(1),
  branch: z.string().min(1),
});

export const githubCreatePullRequestInputSchema = z.object({
  owner: z.string().optional(),
  repo: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  head: z.string().min(1),
  base: z.string().optional(),
});

export const kubeDeployInputSchema = z.object({
  manifest: z.string().min(1),
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
});

export const replayImpactedTrafficInputSchema = z.object({
  namespace: z.string().min(1),
  requestsPerService: z.number().int().min(1).max(10).optional(),
  services: z
    .array(
      z.object({
        name: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        healthPath: z.string().optional(),
        orderPath: z.string().optional(),
      }),
    )
    .optional(),
});

export const gcpListInstancesInputSchema = z.object({
  project: z.string().optional(),
  zone: z.string().optional(),
});

export const gcpGetInstanceInputSchema = z.object({
  project: z.string().optional(),
  zone: z.string().min(1),
  instance: z.string().min(1),
});

export const gcpListStorageBucketsInputSchema = z.object({
  project: z.string().optional(),
});

export const gcpGetStorageBucketInputSchema = z.object({
  // project: z.string().optional(),
  bucket: z.string()
})

export const gcpListBucketObjectsInputSchema = z.object({
  bucket: z.string(),
  prefix: z.string().optional(),
  maxResults: z.number().int().min(1).max(1000).optional(),
})

export const gcpQueryLogsInputSchema = z.object({
  project: z.string().optional(),

  severity: z.enum([
    "DEFAULT",
    "DEBUG",
    "INFO",
    "NOTICE",
    "WARNING",
    "ERROR",
    "CRITICAL",
    "ALERT",
    "EMERGENCY",
  ]).optional(),

  resourceType: z.string().optional(),

  search: z.string().optional(),

  from: z.string().optional(),

  to: z.string().optional(),

  pageSize: z.number().int().min(1).max(100).optional(),

  order: z.enum(["asc", "desc"]).optional(),
});

export const gcpListMetricDescriptorsInputSchema = z.object({
  project: z.string().optional(),

  filter: z.string().optional(),

  pageSize: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional(),
});

export const gcpQueryMetricsInputSchema =
  z.object({
    project: z.string().optional(),

    metricType: z.string(),

    resourceType: z.string().optional(),

    minutes: z
      .number()
      .int()
      .min(1)
      .max(10080)
      .optional(),

    pageSize: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional(),
  });

export const linearListIssuesInputSchema = z.object({
  teamId: z.string().optional(),
  state: z.enum(["backlog", "unstarted", "started", "completed", "canceled"]).optional(),
  assigneeId: z.string().optional(),
  projectId: z.string().optional(),
  first: z.number().int().min(1).max(100).optional(),
});

export const linearGetIssueInputSchema = z.object({
  issueId: z.string().min(1),
});

export const linearSearchIssuesInputSchema = z.object({
  query: z.string().min(1),
  teamId: z.string().optional(),
  first: z.number().int().min(1).max(50).optional(),
});

export const linearListProjectsInputSchema = z.object({
  teamId: z.string().optional(),
  first: z.number().int().min(1).max(100).optional(),
});

export const notionSearchInputSchema = z.object({
  query: z.string().optional(),
  filter: z.enum(["page", "database"]).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const notionGetPageInputSchema = z.object({
  pageId: z.string().min(1),
  includeBlocks: z.boolean().optional(),
});

export const notionListDatabasesInputSchema = z.object({
  query: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export const notionQueryDatabaseInputSchema = z.object({
  databaseId: z.string().optional(),
  filter: z.record(z.string(), z.unknown()).optional(),
  sorts: z.array(z.record(z.string(), z.unknown())).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

export type MemoryRememberInput = z.infer<typeof memoryRememberInputSchema>;
export type MemoryRecallInput = z.infer<typeof memoryRecallInputSchema>;
export type MemoryForgetInput = z.infer<typeof memoryForgetInputSchema>;
export type PredictRiskInput = z.infer<typeof predictRiskInputSchema>;
