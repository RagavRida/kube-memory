import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getEnv, requireApiKeySalt } from "../config/env.js";
import { connectMongo, isMongoConfigured } from "../db/connection.js";
import { ApiKey, type ApiKeyDoc } from "../db/models/ApiKey.js";
import { Workspace, type WorkspaceDoc } from "../db/models/Workspace.js";

export interface AuthContext {
  workspace: WorkspaceDoc;
  apiKey?: ApiKeyDoc;
  role: "reader" | "admin";
  isBootstrap: boolean;
}

declare global {
  namespace Express {
    interface Request {
      kubeAuth?: AuthContext;
    }
  }
}

const API_KEY_PREFIX = "km_";
const AUTH_CACHE_TTL_MS = 60_000;

interface CachedAuth {
  auth: AuthContext;
  expiresAt: number;
}

const authCache = new Map<string, CachedAuth>();

function hashApiKey(rawKey: string): string {
  const salt = requireApiKeySalt();
  return scryptSync(rawKey, salt, 64).toString("hex");
}

function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const computed = hashApiKey(rawKey);
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

async function resolveBootstrapAuth(token: string): Promise<AuthContext | null> {
  const masterKey = getEnv().MASTER_API_KEY;
  if (!masterKey || token !== masterKey) return null;

  if (isMongoConfigured()) {
    await connectMongo();
    let workspace = await Workspace.findOne({ slug: "default" });
    if (!workspace) {
      workspace = await Workspace.create({
        slug: "default",
        name: "Default Workspace",
        cogneeDataset: "main_dataset",
      });
    }
    return {
      workspace,
      role: "admin",
      isBootstrap: true,
    };
  }

  return {
    workspace: {
      _id: createHash("sha256").update("bootstrap").digest() as unknown as WorkspaceDoc["_id"],
      slug: "default",
      name: "Default Workspace",
      cogneeDataset: "main_dataset",
      retentionDays: 90,
    } as WorkspaceDoc,
    role: "admin",
    isBootstrap: true,
  };
}

async function resolveDatabaseAuth(token: string): Promise<AuthContext | null> {
  if (!token.startsWith(API_KEY_PREFIX) || !isMongoConfigured()) return null;

  await connectMongo();
  const prefix = token.slice(0, 8);
  const candidates = await ApiKey.find({ prefix });

  for (const candidate of candidates) {
    if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;
    if (!verifyApiKey(token, candidate.keyHash)) continue;

    const workspace = await Workspace.findById(candidate.workspaceId);
    if (!workspace) continue;

    void ApiKey.updateOne({ _id: candidate._id }, { lastUsedAt: new Date() });

    return {
      workspace,
      apiKey: candidate,
      role: candidate.role,
      isBootstrap: false,
    };
  }

  return null;
}

async function resolveAuthUncached(token: string): Promise<AuthContext | null> {
  return (await resolveDatabaseAuth(token)) ?? (await resolveBootstrapAuth(token));
}

export async function resolveAuth(token: string | null): Promise<AuthContext | null> {
  if (!token) return null;

  const cached = authCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.auth;
  }

  try {
    const auth = await resolveAuthUncached(token);
    if (auth && !auth.isBootstrap) {
      authCache.set(token, { auth, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
    }
    return auth;
  } catch {
    return null;
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  const auth = await resolveAuth(token);

  if (!auth) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  req.kubeAuth = auth;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.kubeAuth?.role !== "admin") {
    res.status(403).json({ error: "Admin role required" });
    return;
  }
  next();
}

export { hashApiKey, API_KEY_PREFIX };
