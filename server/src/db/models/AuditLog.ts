import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IAuditLog extends Document {
  workspaceId: Types.ObjectId;
  apiKeyId?: Types.ObjectId;
  tool: string;
  input: Record<string, unknown>;
  outcome: "success" | "error";
  errorMessage?: string;
  durationMs: number;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "ApiKey" },
    tool: { type: String, required: true },
    input: { type: Schema.Types.Mixed, default: {} },
    outcome: { type: String, enum: ["success", "error"], required: true },
    errorMessage: { type: String },
    durationMs: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ?? mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

export type AuditLogDoc = IAuditLog & { _id: Types.ObjectId };
