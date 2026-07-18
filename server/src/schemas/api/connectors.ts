import { z } from "zod";
import { connectorTypes } from "../../db/models/Connector.js";

export const connectorUpsertSchema = z.object({
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
  secret: z.string().optional(),
});

export const connectorTypeParamSchema = z.enum(connectorTypes);

export type ConnectorUpsertInput = z.infer<typeof connectorUpsertSchema>;
