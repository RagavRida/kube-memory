import { Connector, type ConnectorType } from "../../db/models/Connector.js";
import { decryptSecret } from "../../utils/encryption.js";

const CACHE_TTL_MS = 60_000;

interface CachedConnector {
  config: Record<string, unknown>;
  secret?: string;
  expiresAt: number;
}

const connectorCache = new Map<string, CachedConnector>();

function cacheKey(workspaceId: string, type: ConnectorType): string {
  return `${workspaceId}:${type}`;
}

export function invalidateConnectorCache(
  workspaceId: string,
  type?: ConnectorType,
): void {
  if (type) {
    connectorCache.delete(cacheKey(workspaceId, type));
    return;
  }
  const prefix = `${workspaceId}:`;
  for (const key of connectorCache.keys()) {
    if (key.startsWith(prefix)) connectorCache.delete(key);
  }
}

export async function getConnectorSecret(
  workspaceId: string,
  type: ConnectorType,
): Promise<{ config: Record<string, unknown>; secret?: string } | null> {
  const key = cacheKey(workspaceId, type);
  const cached = connectorCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { config: cached.config, secret: cached.secret };
  }

  const connector = await Connector.findOne({ workspaceId, type, enabled: true });
  if (!connector) return null;

  const entry: CachedConnector = {
    config: connector.config as Record<string, unknown>,
    secret: connector.secretEncrypted ? decryptSecret(connector.secretEncrypted) : undefined,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  connectorCache.set(key, entry);
  return { config: entry.config, secret: entry.secret };
}
