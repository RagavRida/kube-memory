import { useListApiKeysQuery } from "@/store/api/apiKeysApi";
import { useListConnectorsQuery } from "@/store/api/connectorsApi";

export type SetupStep = "integrations" | "api-key" | "ide";

export function useSetupProgress() {
  const { data: connectorsData, isLoading: connectorsLoading } = useListConnectorsQuery();
  const { data: apiKeysData, isLoading: apiKeysLoading } = useListApiKeysQuery();

  const connectors = connectorsData?.connectors
    ? Object.values(connectorsData.connectors)
    : [];
  const configuredCount = connectors.filter((c) => c.configured).length;
  const enabledCount = connectors.filter((c) => c.configured && c.enabled).length;
  const hasIntegration = configuredCount > 0;
  const hasEnabledIntegration = enabledCount > 0;
  const keyCount = apiKeysData?.keys.length ?? 0;
  const hasApiKey = keyCount > 0;

  const isLoading = connectorsLoading || apiKeysLoading;

  let currentStep: SetupStep = "integrations";
  if (hasIntegration && !hasApiKey) currentStep = "api-key";
  if (hasIntegration && hasApiKey) currentStep = "ide";

  const steps = [
    {
      id: "integrations" as const,
      label: "Connect integration",
      done: hasIntegration,
      locked: false,
      href: "/dashboard/integrations",
    },
    {
      id: "api-key" as const,
      label: "Create API key",
      done: hasApiKey,
      locked: !hasIntegration,
      href: "/dashboard/api-keys",
    },
    {
      id: "ide" as const,
      label: "Set up IDE",
      done: hasApiKey,
      locked: !hasApiKey,
      href: "/dashboard/api-keys",
    },
  ];

  return {
    isLoading,
    hasIntegration,
    hasEnabledIntegration,
    hasApiKey,
    configuredCount,
    enabledCount,
    keyCount,
    currentStep,
    steps,
    complete: hasIntegration && hasApiKey,
  };
}
