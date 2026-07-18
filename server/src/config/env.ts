import { config as loadEnv } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
loadEnv({ path: resolve(serverRoot, ".env") });

function stripEmptyEnvValues(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, value === "" ? undefined : value]),
  );
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().min(1).optional(),
  COGNEE_BASE_URL: z.string().url().default("https://api.cognee.ai"),
  COGNEE_API_KEY: z.string().min(1).optional(),
  COGNEE_TENANT_ID: z.string().min(1).optional(),
  MASTER_API_KEY: z.string().min(1).optional(),
  API_KEY_SALT: z.string().min(8).optional(),
  KUBECONFIG_BASE64: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  JWT_SECRET: z.string().min(16).optional(),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),
  GCP_OAUTH_CLIENT_ID: z.string().optional(),
  GCP_OAUTH_CLIENT_SECRET: z.string().optional(),
  GCP_OAUTH_CALLBACK_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CONNECTOR_ENCRYPTION_KEY: z.string().min(32).optional(),
  PAYMENT_SERVICE_GITHUB_OWNER: z.string().optional(),
  PAYMENT_SERVICE_GITHUB_REPO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(stripEmptyEnvValues(process.env));
  return cached;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}

export function requireMongoUri(): string {
  const uri = getEnv().MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  return uri;
}

export function requireCogneeApiKey(): string {
  const key = getEnv().COGNEE_API_KEY;
  if (!key) {
    throw new Error("COGNEE_API_KEY is required");
  }
  return key;
}

export function requireApiKeySalt(): string {
  const salt = getEnv().API_KEY_SALT;
  if (!salt) {
    throw new Error("API_KEY_SALT is required");
  }
  return salt;
}
