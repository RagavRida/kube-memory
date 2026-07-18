export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return "/api";
}

export function getMcpEndpointUrl(): string {
  const base = getApiBaseUrl();
  if (base.startsWith("http")) return `${base}/mcp`;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  return `${origin.replace(/\/$/, "")}/api/mcp`;
}
