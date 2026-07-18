import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const apiKeyRoles = ["reader", "admin"] as const;
export type ApiKeyRole = (typeof apiKeyRoles)[number];

export interface IApiKey extends Document {
  workspaceId: Types.ObjectId;
  keyHash: string;
  prefix: string;
  role: ApiKeyRole;
  label?: string;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    keyHash: { type: String, required: true },
    prefix: { type: String, required: true, index: true },
    role: { type: String, enum: apiKeyRoles, required: true, default: "reader" },
    label: { type: String },
    expiresAt: { type: Date },
    lastUsedAt: { type: Date },
  },
  { timestamps: true },
);

export const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey ?? mongoose.model<IApiKey>("ApiKey", apiKeySchema);

export type ApiKeyDoc = IApiKey & { _id: Types.ObjectId };
