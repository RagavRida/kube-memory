import type { FailureCategory } from "../../schemas/graph/index.js";

export interface IncidentOpenInput {
  serviceName: string;
  namespace?: string;
  podName?: string;
  title?: string;
  severity?: "low" | "medium" | "high" | "critical";
  githubOwner?: string;
  githubRepo?: string;
  argocdApplication?: string;
  prometheusQuery?: string;
  notifySlack?: boolean;
  slackChannel?: string;
  triggerPagerDuty?: boolean;
  pagerDutyServiceId?: string;
  rememberInMemory?: boolean;
  onCallTeam?: string;
  impactedServices?: string[];
}

export interface IncidentContextSnapshot {
  kubernetes?: {
    events?: unknown[];
    logs?: string;
    podStatus?: {
      phase?: string;
      containerReason?: string;
      exitCode?: number;
    };
    error?: string;
  };
  github?: {
    commits?: unknown[];
    pullRequests?: unknown[];
    error?: string;
  };
  prometheus?: {
    alerts?: unknown[];
    query?: string;
    queryResult?: unknown;
    error?: string;
  };
  argocd?: {
    application?: unknown;
    error?: string;
  };
  memory?: {
    similarEpisodes?: unknown;
    error?: string;
  };
}

export interface IncidentOpenResult {
  incidentId: string;
  title: string;
  status: string;
  severity: string;
  rootCauseCategory?: FailureCategory;
  rootCauseDescription?: string;
  recommendedFix?: string;
  memoryRecordId?: string;
  memoryIndexingStatus?: string;
  pagerDutyIncidentId?: string;
  pagerDutyIncidentUrl?: string;
  slackChannel?: string;
  slackMessageTs?: string;
  context: IncidentContextSnapshot;
  connectorsUsed: string[];
  connectorsSkipped: string[];
}
