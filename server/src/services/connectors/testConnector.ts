import { Connector, type ConnectorType } from "../../db/models/Connector.js";
import { decryptSecret } from "../../utils/encryption.js";
import { getCoreV1ApiForKubeconfig } from "../kubernetes/client.js";

export async function testConnector(
  workspaceId: string,
  type: ConnectorType,
): Promise<{ ok: boolean; message: string }> {
  const connector = await Connector.findOne({ workspaceId, type });
  if (!connector?.secretEncrypted) {
    return { ok: false, message: "Connector is not configured" };
  }

  const secret = decryptSecret(connector.secretEncrypted);

  switch (type) {
    case "kubernetes": {
      const api = getCoreV1ApiForKubeconfig(secret);
      await api.listNamespace();
      return { ok: true, message: "Kubernetes connection successful" };
    }
    case "github": {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${secret}`,
          Accept: "application/vnd.github+json",
        },
      });
      if (!res.ok) return { ok: false, message: "GitHub authentication failed" };
      return { ok: true, message: "GitHub connection successful" };
    }
    case "slack": {
      const res = await fetch("https://slack.com/api/auth.test", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = (await res.json()) as { ok: boolean };
      return data.ok
        ? { ok: true, message: "Slack connection successful" }
        : { ok: false, message: "Slack authentication failed" };
    }
    case "pagerduty": {
      const res = await fetch("https://api.pagerduty.com/users", {
        headers: {
          Authorization: `Token token=${secret}`,
          Accept: "application/vnd.pagerduty+json;version=2",
        },
      });
      return res.ok
        ? { ok: true, message: "PagerDuty connection successful" }
        : { ok: false, message: "PagerDuty authentication failed" };
    }
    case "prometheus": {
      const baseUrl = String(connector.config.baseUrl ?? "").replace(/\/$/, "");
      if (!baseUrl) return { ok: false, message: "Base URL is required" };
      const res = await fetch(`${baseUrl}/-/healthy`, {
        headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
      }).catch(() => null);
      if (res?.ok) return { ok: true, message: "Prometheus connection successful" };
      const fallback = await fetch(`${baseUrl}/api/v1/status/config`, {
        headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
      }).catch(() => null);
      return fallback?.ok
        ? { ok: true, message: "Prometheus connection successful" }
        : { ok: false, message: "Prometheus connection failed" };
    }
    case "argocd": {
      const baseUrl = String(connector.config.baseUrl ?? "").replace(/\/$/, "");
      if (!baseUrl) return { ok: false, message: "Base URL is required" };
      const headers = { Authorization: `Bearer ${secret}` };
      const health = await fetch(`${baseUrl}/healthz`, { headers }).catch(() => null);
      if (health?.ok) return { ok: true, message: "ArgoCD connection successful" };
      const apps = await fetch(`${baseUrl}/api/v1/applications`, { headers }).catch(() => null);
      return apps?.ok
        ? { ok: true, message: "ArgoCD connection successful" }
        : { ok: false, message: "ArgoCD connection failed" };
    }
    case "gcp": {
      if (!connector.config.projectId) {
        return { ok: false, message: "Default project ID is required" };
      }
      try {
        const { testGcpConnection } = await import("../gcp/client.js");
        await testGcpConnection(workspaceId);
        return { ok: true, message: "Google Cloud connection successful" };
      } catch {
        return { ok: false, message: "Google Cloud connection failed" };
      }
    }
    case "linear": {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
      });
      if (!res.ok) return { ok: false, message: "Linear authentication failed" };
      const data = (await res.json()) as { errors?: unknown[]; data?: { viewer?: unknown } };
      if (data.errors?.length || !data.data?.viewer) {
        return { ok: false, message: "Linear authentication failed" };
      }
      return { ok: true, message: "Linear connection successful" };
    }
    case "notion": {
      const res = await fetch("https://api.notion.com/v1/users/me", {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Notion-Version": "2022-06-28",
        },
      });
      return res.ok
        ? { ok: true, message: "Notion connection successful" }
        : { ok: false, message: "Notion authentication failed" };
    }
    default:
      return { ok: false, message: "Unsupported connector" };
  }
}
