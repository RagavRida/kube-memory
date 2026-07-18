import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { getEnv } from "../../config/env.js";
import { Connector } from "../../db/models/Connector.js";
import { encryptSecret, decryptSecret, isEncryptionConfigured } from "../../utils/encryption.js";
import { invalidateConnectorCache } from "../connectors/connectorSecrets.js";

const GCP_SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only";
const STATE_TTL_SEC = 600;

export interface GcpOAuthState {
  workspaceId: string;
  projectId: string;
  nonce: string;
}

export function isGcpOAuthConfigured(): boolean {
  const env = getEnv();
  return Boolean(
    env.GCP_OAUTH_CLIENT_ID &&
      env.GCP_OAUTH_CLIENT_SECRET &&
      env.GCP_OAUTH_CALLBACK_URL &&
      env.JWT_SECRET,
  );
}

function signOAuthState(payload: GcpOAuthState): string {
  const env = getEnv();
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for GCP OAuth");
  }
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: STATE_TTL_SEC });
}

function verifyOAuthState(state: string): GcpOAuthState {
  const env = getEnv();
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for GCP OAuth");
  }
  return jwt.verify(state, env.JWT_SECRET) as GcpOAuthState;
}

export function buildGcpOAuthUrl(workspaceId: string, projectId: string): string | null {
  if (!isGcpOAuthConfigured()) return null;

  const env = getEnv();
  const state = signOAuthState({
    workspaceId,
    projectId,
    nonce: randomBytes(16).toString("hex"),
  });

  const params = new URLSearchParams({
    client_id: env.GCP_OAUTH_CLIENT_ID!,
    redirect_uri: env.GCP_OAUTH_CALLBACK_URL!,
    response_type: "code",
    scope: GCP_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

// SECURITY-REVIEW: OAuth callback exchanges code for tokens and stores encrypted refresh token
export async function handleGcpOAuthCallback(
  code: string,
  state: string,
): Promise<{ workspaceId: string; projectId: string }> {
  if (!isEncryptionConfigured()) {
    throw new Error("Connector encryption is not configured");
  }

  const { workspaceId, projectId } = verifyOAuthState(state);
  const env = getEnv();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GCP_OAUTH_CLIENT_ID!,
      client_secret: env.GCP_OAUTH_CLIENT_SECRET!,
      redirect_uri: env.GCP_OAUTH_CALLBACK_URL!,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
  if (!tokenData.refresh_token && !tokenData.access_token) {
    throw new Error(tokenData.error_description ?? "OAuth token exchange failed");
  }

  const existing = await Connector.findOne({ workspaceId, type: "gcp" });
  let refreshToken = tokenData.refresh_token;
  if (!refreshToken && existing?.secretEncrypted) {
    try {
      const existingSecret = JSON.parse(decryptSecret(existing.secretEncrypted)) as {
        refresh_token?: string;
      };
      refreshToken = existingSecret.refresh_token;
    } catch {
      // ignore parse errors — new connect must supply refresh_token
    }
  }

  if (!refreshToken && !tokenData.access_token) {
    throw new Error("OAuth token exchange failed");
  }

  const secretPayload = {
    refresh_token: refreshToken,
    access_token: tokenData.access_token,
    expiry_date: tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : undefined,
  };

  await Connector.findOneAndUpdate(
    { workspaceId, type: "gcp" },
    {
      $set: {
        enabled: false,
        config: { projectId },
        secretEncrypted: encryptSecret(JSON.stringify(secretPayload)),
        healthStatus: "healthy",
      },
      $setOnInsert: { workspaceId, type: "gcp" },
    },
    { upsert: true, new: true },
  );

  invalidateConnectorCache(workspaceId, "gcp");

  return { workspaceId, projectId };
}

export function gcpOAuthClientRedirectUrl(status: "connected" | "error"): string {
  const env = getEnv();
  const url = new URL("/dashboard/integrations", env.CLIENT_URL);
  url.searchParams.set("gcp", status);
  return url.toString();
}
