import { z } from "zod";
import { apiKeyRoles } from "../../db/models/ApiKey.js";

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(120),
  role: z.enum(apiKeyRoles).default("reader"),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
