import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Key01Icon,
  Plug01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ActiveConnectorsPanel } from "@/components/dashboard/ActiveConnectorsPanel";
import { useSetupProgress } from "@/hooks/useSetupProgress";

export function DashboardPage() {
  const {
    isLoading,
    hasIntegration,
    hasEnabledIntegration,
    configuredCount,
    enabledCount,
    keyCount,
    currentStep,
    complete,
  } = useSetupProgress();

  return (
    <div className="dashboard-main space-y-8">
      <PageHeader
        title="Welcome back"
        description="Follow the setup path: connect an integration, create an API key, then paste the MCP config into your IDE."
      />

      {!isLoading && hasIntegration && !hasEnabledIntegration && (
        <Alert>
          <AlertTitle>Enable an integration for MCP</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              {configuredCount} integration(s) saved but none are enabled. MCP tools only use enabled connectors.
            </span>
            <Button asChild size="sm">
              <Link to="/dashboard/integrations">Enable integration</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !complete && (
        <Alert>
          <AlertTitle>
            {currentStep === "integrations" && "Start with an integration"}
            {currentStep === "api-key" && "Create your API key"}
            {currentStep === "ide" && "Finish IDE setup"}
          </AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {currentStep === "integrations" && (
              <>
                <span>Connect Kubernetes or another app to unlock API keys and MCP tools.</span>
                <Button asChild size="sm">
                  <Link to="/dashboard/integrations">Connect integration</Link>
                </Button>
              </>
            )}
            {currentStep === "api-key" && (
              <>
                <span>{configuredCount} integration(s) connected. Create a key to authenticate your IDE.</span>
                <Button asChild size="sm">
                  <Link to="/dashboard/api-keys">Create API key</Link>
                </Button>
              </>
            )}
            {currentStep === "ide" && (
              <>
                <span>Your key is ready. Copy the MCP config for Cursor, VS Code, or Claude Desktop.</span>
                <Button asChild size="sm">
                  <Link to="/dashboard/api-keys">Set up IDE</Link>
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Link to="/dashboard/integrations" className="stat-card group block">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Integrations
            </p>
            <p className="stat-card-value mt-2">{configuredCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {enabledCount} active for MCP
            </p>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="mt-3 size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            />
          </Link>
          <Link
            to="/dashboard/api-keys"
            className={`stat-card group block ${!hasIntegration ? "pointer-events-none opacity-50" : ""}`}
            aria-disabled={!hasIntegration}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              API keys
            </p>
            <p className="stat-card-value mt-2">{keyCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasIntegration ? "For MCP clients" : "Locked — connect integration first"}
            </p>
          </Link>
          <div className="stat-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Setup status
            </p>
            <p className="stat-card-value mt-2 text-lg">{complete ? "Ready" : "In progress"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {complete ? "IDE can connect" : "Complete all steps above"}
            </p>
          </div>
        </div>
      )}

      <ActiveConnectorsPanel />

      <section className="space-y-4">
        <h2 className="font-heading text-sm font-medium">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/dashboard/integrations" className="quick-action-link group">
            <HugeiconsIcon icon={Plug01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Integrations</span>
              <span className="block text-xs text-muted-foreground">
                Connect Kubernetes, GitHub, Slack, and more
              </span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
          </Link>
          <Link
            to="/dashboard/api-keys"
            className={`quick-action-link group ${!hasIntegration ? "pointer-events-none opacity-50" : ""}`}
          >
            <HugeiconsIcon icon={Key01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">API Keys</span>
              <span className="block text-xs text-muted-foreground">
                {hasIntegration ? "Create and manage MCP keys" : "Available after step 1"}
              </span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>
    </div>
  );
}
