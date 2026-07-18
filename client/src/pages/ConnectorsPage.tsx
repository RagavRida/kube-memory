import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, Plug01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ConnectorIcon } from "@/components/dashboard/ConnectorIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  type ConnectorType,
  useListConnectorsQuery,
  useTestConnectorMutation,
  useUpsertConnectorMutation,
  useDeleteConnectorMutation,
  useStartGcpOAuthMutation,
} from "@/store/api/connectorsApi";

interface ConnectorMeta {
  type: ConnectorType;
  title: string;
  description: string;
  authMethod?: "credentials" | "oauth";
  tools: string[];
  docsLink?: string;
  fields: Array<{ key: string; label: string; type: "text" | "textarea" | "secret"; placeholder?: string; required?: boolean }>;
}

const CONNECTORS: ConnectorMeta[] = [
  {
    type: "kubernetes",
    title: "Kubernetes",
    description: "Read pod logs and cluster events via MCP.",
    tools: ["k8s_pod_logs", "k8s_get_events"],
    fields: [{ key: "secret", label: "Kubeconfig YAML", type: "textarea", placeholder: "Paste kubeconfig…", required: true }],
  },
  {
    type: "github",
    title: "GitHub",
    description: "Query issues, PRs, and commits via your dashboard PAT — agents must not use local git.",
    tools: [
      "github_get_authenticated_user",
      "github_list_repositories",
      "github_list_recent_commits",
      "github_list_issues",
      "github_list_pull_requests",
      "github_list_commits",
      "github_get_pull_request",
    ],
    fields: [
      { key: "secret", label: "Personal access token", type: "secret", required: true },
      { key: "org", label: "Org or user scope", type: "text", placeholder: "my-org" },
    ],
  },
  {
    type: "slack",
    title: "Slack",
    description: "Read channel history, inspect channels, list users, and post memory snippets.",
    tools: [
      "slack_get_history",
      "slack_get_channel_info",
      "slack_get_replies",
      "slack_list_channels",
      "slack_list_users",
      "slack_post_message",
    ],
    fields: [
      { key: "secret", label: "Bot token", type: "secret", required: true },
      { key: "channel", label: "Default channel", type: "text", placeholder: "#incidents" },
    ],
  },
  {
    type: "pagerduty",
    title: "PagerDuty",
    description: "Create and inspect incidents for on-call routing and alert enrichment.",
    docsLink: "/docs?tab=connectors&connector=pagerduty",
    tools: [
      "pagerduty_create_incident",
      "pagerduty_list_incidents",
      "pagerduty_get_incident",
      "pagerduty_list_services",
      "pagerduty_get_incident_log_entries",
      "pagerduty_list_incident_notes",
      "pagerduty_list_oncalls",
      "pagerduty_list_users",
    ],
    fields: [
      { key: "secret", label: "API key", type: "secret", required: true },
      { key: "defaultServiceId", label: "Default service ID", type: "text", placeholder: "PXXXXXX" },
    ],
  },
  {
    type: "prometheus",
    title: "Prometheus",
    description: "Run PromQL queries and inspect alerts and targets.",
    docsLink: "/docs?tab=connectors&connector=prometheus",
    tools: [
      "prometheus_query",
      "prometheus_query_range",
      "prometheus_list_alerts",
      "prometheus_list_targets",
      "prometheus_list_rules",
      "prometheus_list_alertmanagers",
      "prometheus_list_labels",
      "prometheus_list_label_values",
    ],
    fields: [
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://prometheus.example.com", required: true },
      { key: "secret", label: "Bearer token", type: "secret" },
    ],
  },
  {
    type: "argocd",
    title: "ArgoCD",
    description: "Inspect GitOps apps, sync, and rollback deployments.",
    docsLink: "/docs?tab=connectors&connector=argocd",
    tools: [
      "argocd_list_applications",
      "argocd_get_application",
      "argocd_get_app_history",
      "argocd_list_app_events",
      "argocd_get_app_resource_tree",
      "argocd_list_projects",
      "argocd_list_repositories",
      "argocd_sync_application",
      "argocd_rollback_application",
    ],
    fields: [
      { key: "baseUrl", label: "Base URL", type: "text", placeholder: "https://argocd.example.com", required: true },
      { key: "secret", label: "API token", type: "secret", required: true },
    ],
  },
  {
    type: "gcp",
    title: "Google Cloud",
    description: "Read Compute Engine VMs, Cloud Storage, logs, and metrics via OAuth — agents must not use local gcloud.",
    authMethod: "oauth",
    docsLink: "/docs?tab=connectors&connector=gcp",
    tools: [
      "gcp_list_instances",
      "gcp_get_instance",
      "gcp_list_storage_buckets",
      "gcp_get_storage_bucket",
      "gcp_list_bucket_objects",
      "gcp_query_logs",
      "gcp_list_metric_descriptors",
      "gcp_query_metrics",
    ],
    fields: [
      { key: "projectId", label: "Default project ID", type: "text", placeholder: "my-gcp-project", required: true },
    ],
  },
  {
    type: "linear",
    title: "Linear",
    description: "Query teams, issues, and projects for incident ticket context.",
    docsLink: "/docs?tab=connectors&connector=linear",
    tools: [
      "linear_list_teams",
      "linear_list_issues",
      "linear_get_issue",
      "linear_search_issues",
      "linear_list_projects",
    ],
    fields: [
      { key: "secret", label: "API key", type: "secret", required: true },
      { key: "teamId", label: "Default team ID", type: "text", placeholder: "team-uuid" },
    ],
  },
  {
    type: "notion",
    title: "Notion",
    description: "Search pages and databases for runbooks and incident docs.",
    docsLink: "/docs?tab=connectors&connector=notion",
    tools: [
      "notion_search",
      "notion_get_page",
      "notion_list_databases",
      "notion_query_database",
    ],
    fields: [
      { key: "secret", label: "Integration token", type: "secret", required: true },
      { key: "defaultDatabaseId", label: "Default database ID", type: "text", placeholder: "database-uuid" },
    ],
  },
];

type DialogPhase = "credentials" | "post-save";

function connectorStatus(
  summary?: { configured: boolean; enabled: boolean },
): "configured" | "not-set" | "inactive" {
  if (!summary?.configured) return "not-set";
  if (!summary.enabled) return "inactive";
  return "configured";
}

function hasRequiredFields(meta: ConnectorMeta, config: Record<string, string>, secret: string, isConfigured: boolean) {
  if (isConfigured) return true;
  if (meta.authMethod === "oauth") {
    return meta.fields
      .filter((f) => f.required)
      .every((f) => config[f.key]?.trim());
  }
  for (const field of meta.fields) {
    if (!field.required) continue;
    if (field.type === "secret" || field.type === "textarea") {
      if (!secret.trim()) return false;
    } else if (!config[field.key]?.trim()) {
      return false;
    }
  }
  return true;
}

function ConnectorDocsLink({ meta }: { meta: ConnectorMeta }) {
  if (!meta.docsLink) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <Link to={meta.docsLink} aria-label={`How to connect ${meta.title}`}>
              <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>How to connect {meta.title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ConnectorsPage() {
  const { data, isLoading, refetch } = useListConnectorsQuery();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upsert, { isLoading: saving }] = useUpsertConnectorMutation();
  const [test, { isLoading: testing }] = useTestConnectorMutation();
  const [deleteConnector, { isLoading: disconnecting }] = useDeleteConnectorMutation();
  const [startGcpOAuth, { isLoading: startingOAuth }] = useStartGcpOAuthMutation();
  const [active, setActive] = useState<ConnectorMeta | null>(null);
  const [phase, setPhase] = useState<DialogPhase>("credentials");
  const [enabled, setEnabled] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [secret, setSecret] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const configuredCount = data
    ? Object.values(data.connectors).filter((c) => c.configured).length
    : 0;

  useEffect(() => {
    const gcpStatus = searchParams.get("gcp");
    if (!gcpStatus) return;

    const gcpMeta = CONNECTORS.find((c) => c.type === "gcp");
    if (gcpStatus === "connected" && gcpMeta) {
      void refetch().then((result) => {
        const summary = result.data?.connectors.gcp;
        setConfig({ projectId: String(summary?.config.projectId ?? "") });
      });
      toast.success("Google Cloud connected successfully");
      setActive(gcpMeta);
      setPhase("post-save");
      setEnabled(false);
      setTestResult({ ok: true, message: "Google Cloud connection successful" });
    } else if (gcpStatus === "error") {
      toast.error("Google Cloud connection failed");
    }

    const next = new URLSearchParams(searchParams);
    next.delete("gcp");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refetch]);

  function openConfigure(meta: ConnectorMeta) {
    const current = data?.connectors[meta.type];
    const isConfigured = Boolean(current?.configured);
    setActive(meta);
    setPhase("credentials");
    setEnabled(current?.enabled ?? false);
    setConfig(
      Object.fromEntries(
        meta.fields
          .filter((f) => f.type !== "secret" && f.type !== "textarea")
          .map((f) => [f.key, String(current?.config[f.key] ?? "")]),
      ),
    );
    setSecret("");
    setTestResult(null);
    if (isConfigured) {
      setPhase("credentials");
    }
  }

  function closeDialog() {
    setActive(null);
    setPhase("credentials");
    setTestResult(null);
  }

  async function handleTest() {
    if (!active) return;
    const isConfigured = Boolean(data?.connectors[active.type]?.configured);
    if (!hasRequiredFields(active, config, secret, isConfigured)) {
      toast.error("Fill in required fields before testing");
      return;
    }

    await upsert({
      type: active.type,
      enabled: data?.connectors[active.type]?.enabled ?? false,
      config,
      secret: secret || undefined,
    }).unwrap();

    const result = await test(active.type).unwrap();
    setTestResult(result);
    if (result.ok) toast.success("Connection test passed");
    else toast.error("Connection test failed");
  }

  async function handleSave() {
    if (!active) return;
    const isConfigured = Boolean(data?.connectors[active.type]?.configured);
    if (!isConfigured && !testResult?.ok) {
      toast.error("Run a successful connection test before saving");
      return;
    }

    await upsert({
      type: active.type,
      enabled: isConfigured ? enabled : false,
      config,
      secret: secret || undefined,
    }).unwrap();

    if (!isConfigured) {
      setPhase("post-save");
      setEnabled(false);
      toast.success(`${active.title} saved — enable it when ready`);
    } else {
      toast.success(`${active.title} updated`);
      closeDialog();
    }
  }

  async function handlePostSaveDone() {
    if (!active) return;
    await upsert({
      type: active.type,
      enabled,
      config,
    }).unwrap();
    toast.success(enabled ? `${active.title} enabled` : `${active.title} saved (disabled)`);
    closeDialog();
  }

  async function handleToggleEnabled(meta: ConnectorMeta) {
    const summary = data?.connectors[meta.type];
    if (!summary?.configured) return;
    await upsert({
      type: meta.type,
      enabled: !summary.enabled,
      config: summary.config as Record<string, string>,
    }).unwrap();
    toast.success(`${meta.title} ${summary.enabled ? "disabled" : "enabled"}`);
  }

  async function handleOAuthConnect() {
    if (!active || active.authMethod !== "oauth") return;
    if (!hasRequiredFields(active, config, secret, false)) {
      toast.error("Fill in required fields before connecting");
      return;
    }

    try {
      const { url } = await startGcpOAuth({ projectId: config.projectId.trim() }).unwrap();
      window.location.href = url;
    } catch {
      toast.error("Failed to start Google Cloud OAuth");
    }
  }

  async function handleDisconnect() {
    if (!active) return;
    await deleteConnector(active.type).unwrap();
    toast.success(`${active.title} disconnected`);
    closeDialog();
  }

  const isOAuthActive = active?.authMethod === "oauth";
  const isConfiguredActive = active ? Boolean(data?.connectors[active.type]?.configured) : false;
  const canSave =
    isConfiguredActive || testResult?.ok === true;

  return (
    <div className="dashboard-main space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect at least one integration before creating an API key. Test credentials, save, then enable when you are ready."
        action={
          configuredCount > 0 ? (
            <StatusBadge status="active" label={`${configuredCount} connected`} />
          ) : (
            <StatusBadge status="warning" label="Step 1 — connect an app" />
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONNECTORS.map((meta) => {
            const summary = data?.connectors[meta.type];
            const status = connectorStatus(summary);
            return (
              <article
                key={meta.type}
                className="interactive-card flex flex-col rounded-xl p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/30 text-foreground">
                      <ConnectorIcon type={meta.type} className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="font-heading text-base font-medium">{meta.title}</h3>
                        <ConnectorDocsLink meta={meta} />
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {meta.description}
                </p>
                <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted-foreground/80">
                  {meta.tools.length} MCP tool{meta.tools.length === 1 ? "" : "s"}
                </p>
                <div className="-mx-5 mt-4 flex items-center justify-between gap-3 border-t px-5 pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={summary?.enabled ?? false}
                      disabled={!summary?.configured || saving}
                      onCheckedChange={() => handleToggleEnabled(meta)}
                      aria-label={`${meta.title} enabled`}
                    />
                    <span>{summary?.configured ? (summary.enabled ? "Enabled" : "Disabled") : "Not configured"}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openConfigure(meta)}>
                    {summary?.configured ? "Manage" : "Connect"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && configuredCount === 0 && (
        <Empty className="border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Plug01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Connect your first integration</EmptyTitle>
            <EmptyDescription>
              Kubernetes is the fastest path to live MCP tools. You need at least one integration before creating an API key.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openConfigure(CONNECTORS[0])}>Connect Kubernetes</Button>
          </EmptyContent>
        </Empty>
      )}

      {configuredCount > 0 && (
        <Alert>
          <AlertTitle>Next step</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Integration connected. Create an API key to authenticate your IDE.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/dashboard/api-keys">Go to API Keys</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {phase === "credentials" ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active ? <ConnectorIcon type={active.type} className="size-5" /> : null}
                  {active?.title}
                  {active ? <ConnectorDocsLink meta={active} /> : null}
                </DialogTitle>
                <DialogDescription>
                  {isOAuthActive && !isConfiguredActive
                    ? "Enter your default GCP project ID, then authorize kube-memory via Google OAuth."
                    : isConfiguredActive
                      ? isOAuthActive
                        ? "Manage OAuth connection, project settings, or toggle availability below."
                        : "Update credentials or toggle availability below."
                      : "Enter credentials, test the connection, then save. You can enable the integration after saving."}
                </DialogDescription>
              </DialogHeader>
              {isOAuthActive && isConfiguredActive && (
                <Alert>
                  <AlertTitle>Connected via Google OAuth</AlertTitle>
                  <AlertDescription>
                    Credentials are stored encrypted. Use Reconnect to refresh the OAuth grant.
                  </AlertDescription>
                </Alert>
              )}
              <FieldGroup>
                {active?.fields.map((field) => (
                  <Field key={field.key}>
                    <FieldLabel htmlFor={field.key}>
                      {field.label}
                      {field.required && !isConfiguredActive ? (
                        <span className="text-destructive"> *</span>
                      ) : null}
                    </FieldLabel>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={field.key}
                        placeholder={field.placeholder}
                        value={secret}
                        onChange={(e) => {
                          setSecret(e.target.value);
                          setTestResult(null);
                        }}
                        rows={8}
                        className="field-sizing-fixed max-h-48 min-h-32 resize-y overflow-y-auto font-mono text-xs"
                      />
                    ) : field.type === "secret" ? (
                      <Input
                        id={field.key}
                        type="password"
                        placeholder={isConfiguredActive ? "Leave blank to keep existing" : "Required"}
                        value={secret}
                        onChange={(e) => {
                          setSecret(e.target.value);
                          setTestResult(null);
                        }}
                        autoComplete="off"
                      />
                    ) : (
                      <Input
                        id={field.key}
                        placeholder={field.placeholder}
                        value={config[field.key] ?? ""}
                        onChange={(e) => {
                          setConfig((c) => ({ ...c, [field.key]: e.target.value }));
                          setTestResult(null);
                        }}
                      />
                    )}
                  </Field>
                ))}

                {isConfiguredActive && (
                  <Field className="flex flex-row items-center justify-between rounded-lg border bg-muted/20 p-4">
                    <div>
                      <FieldLabel htmlFor="enabled-manage" className="text-sm font-medium">
                        Integration enabled
                      </FieldLabel>
                      <p className="text-xs text-muted-foreground">
                        Disabled integrations keep credentials but pause MCP access
                      </p>
                    </div>
                    <Switch id="enabled-manage" checked={enabled} onCheckedChange={setEnabled} />
                  </Field>
                )}
              </FieldGroup>

              {testResult && (
                <Alert variant={testResult.ok ? "default" : "destructive"}>
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
                {isOAuthActive && isConfiguredActive && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      disabled={disconnecting || saving}
                      className="mr-auto text-destructive hover:text-destructive"
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleOAuthConnect}
                      disabled={startingOAuth || !config.projectId?.trim()}
                    >
                      {startingOAuth ? "Redirecting…" : "Reconnect"}
                    </Button>
                  </>
                )}
                {!(isOAuthActive && !isConfiguredActive) && (
                  <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
                    {testing ? "Testing…" : "Test connection"}
                  </Button>
                )}
                {isOAuthActive && !isConfiguredActive ? (
                  <Button onClick={handleOAuthConnect} disabled={startingOAuth || !config.projectId?.trim()}>
                    {startingOAuth ? "Redirecting…" : "Connect with Google Cloud"}
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={saving || !canSave}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {active ? <ConnectorIcon type={active.type} className="size-5" /> : null}
                  {active?.title} saved
                  {active ? <ConnectorDocsLink meta={active} /> : null}
                </DialogTitle>
                <DialogDescription>
                  Credentials stored. Enable this integration when you want MCP tools to use it.
                </DialogDescription>
              </DialogHeader>

              <Alert className="border-[color-mix(in_oklch,var(--color-success)_35%,var(--border))]">
                <AlertTitle>Connection verified</AlertTitle>
                <AlertDescription>
                  Your test passed. The integration is saved but disabled until you turn it on.
                </AlertDescription>
              </Alert>

              <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div>
                  <FieldLabel htmlFor="enabled-post" className="text-sm font-medium">
                    Enable integration
                  </FieldLabel>
                  <p className="text-xs text-muted-foreground">
                    You can change this anytime from the card toggle
                  </p>
                </div>
                <Switch id="enabled-post" checked={enabled} onCheckedChange={setEnabled} />
              </Field>

              <DialogFooter className="pt-2">
                <Button onClick={handlePostSaveDone} disabled={saving} className="w-full sm:w-auto">
                  {saving ? "Saving…" : "Done"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
