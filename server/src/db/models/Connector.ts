import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const connectorTypes = [
  "kubernetes",
  "github",
  "slack",
  "pagerduty",
  "prometheus",
  "argocd",
  "gcp",
  "linear",
  "notion",
] as const;

export type ConnectorType = (typeof connectorTypes)[number];

export const connectorHealthStatuses = ["healthy", "degraded", "error"] as const;
export type ConnectorHealthStatus = (typeof connectorHealthStatuses)[number];

export interface IConnector extends Document {
  workspaceId: Types.ObjectId;
  type: ConnectorType;
  enabled: boolean;
  config: Record<string, unknown>;
  secretRef?: string;
  secretEncrypted?: string;
  healthStatus: ConnectorHealthStatus;
  createdAt: Date;
  updatedAt: Date;
}

const connectorSchema = new Schema<IConnector>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    type: { type: String, enum: connectorTypes, required: true },
    enabled: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, default: {} },
    secretRef: { type: String },
    secretEncrypted: { type: String },
    healthStatus: { type: String, enum: connectorHealthStatuses, default: "healthy" },
  },
  { timestamps: true },
);

connectorSchema.index({ workspaceId: 1, type: 1 }, { unique: true });

export const Connector: Model<IConnector> =
  mongoose.models.Connector ?? mongoose.model<IConnector>("Connector", connectorSchema);

export type ConnectorDoc = IConnector & { _id: Types.ObjectId };
