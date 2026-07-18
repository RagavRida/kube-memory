import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { ConnectorIcon } from "@/components/dashboard/ConnectorIcon";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ConnectorSummary,
  type ConnectorType,
  useListConnectorsQuery,
} from "@/store/api/connectorsApi";

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  kubernetes: "Kubernetes",
  github: "GitHub",
  slack: "Slack",
  pagerduty: "PagerDuty",
  prometheus: "Prometheus",
  argocd: "ArgoCD",
  gcp: "Google Cloud",
  linear: "Linear",
  notion: "Notion",
};

function connectorRowStatus(summary: ConnectorSummary | undefined): {
  status: "active" | "inactive" | "configured" | "not-set";
  label: string;
} {
  if (!summary?.configured) {
    return { status: "not-set", label: "Not connected" };
  }
  if (summary.enabled) {
    return { status: "active", label: "Active for MCP" };
  }
  return { status: "inactive", label: "Configured — enable for MCP" };
}

export function ActiveConnectorsPanel() {
  const { data, isLoading } = useListConnectorsQuery();
  const connectors = data?.connectors;

  if (isLoading) {
    return (
      <section className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const entries = (Object.keys(CONNECTOR_LABELS) as ConnectorType[]).map((type) => ({
    type,
    name: CONNECTOR_LABELS[type],
    summary: connectors?.[type],
    ...connectorRowStatus(connectors?.[type]),
  }));

  const activeCount = entries.filter((e) => e.status === "active").length;
  const configuredCount = entries.filter((e) => e.summary?.configured).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-sm font-medium">Workspace integrations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeCount} active for MCP · {configuredCount} configured · credentials stored encrypted per workspace
          </p>
        </div>
        <Link
          to="/dashboard/integrations"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Manage integrations
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Link>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.type}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <ConnectorIcon type={entry.type} className="size-5" />
              <span className="truncate text-sm font-medium">{entry.name}</span>
            </div>
            <StatusBadge status={entry.status} label={entry.label} />
          </div>
        ))}
      </div>

      {configuredCount > 0 && activeCount === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          You have configured integrations but none are enabled. Toggle <strong>Enabled</strong> on the
          Integrations page — MCP tools only use enabled connectors.
        </p>
      )}
    </section>
  );
}
