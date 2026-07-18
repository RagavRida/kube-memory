import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const incidentStatuses = ["open", "investigating", "resolved", "closed"] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export const incidentSeverities = ["low", "medium", "high", "critical"] as const;
export type IncidentSeverity = (typeof incidentSeverities)[number];

export interface IIncidentRecord extends Document {
  workspaceId: Types.ObjectId;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  serviceName: string;
  namespace?: string;
  podName?: string;
  rootCauseCategory?: string;
  rootCauseDescription?: string;
  recommendedFix?: string;
  memoryRecordId?: string;
  pagerDutyIncidentId?: string;
  pagerDutyIncidentUrl?: string;
  slackChannel?: string;
  slackMessageTs?: string;
  onCallAssignee?: string;
  fixPrUrl?: string;
  impactedServices?: string[];
  notes?: Array<{ text: string; createdAt: Date }>;
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const incidentRecordSchema = new Schema<IIncidentRecord>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    title: { type: String, required: true },
    status: { type: String, enum: incidentStatuses, default: "open", index: true },
    severity: { type: String, enum: incidentSeverities, default: "high" },
    serviceName: { type: String, required: true, index: true },
    namespace: { type: String },
    podName: { type: String },
    rootCauseCategory: { type: String, index: true },
    rootCauseDescription: { type: String },
    recommendedFix: { type: String },
    memoryRecordId: { type: String },
    pagerDutyIncidentId: { type: String },
    pagerDutyIncidentUrl: { type: String },
    slackChannel: { type: String },
    slackMessageTs: { type: String },
    onCallAssignee: { type: String },
    fixPrUrl: { type: String },
    impactedServices: [{ type: String }],
    notes: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    context: { type: Schema.Types.Mixed, default: {} },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

export const IncidentRecord: Model<IIncidentRecord> =
  mongoose.models.IncidentRecord ??
  mongoose.model<IIncidentRecord>("IncidentRecord", incidentRecordSchema);

export type IncidentRecordDoc = IIncidentRecord & { _id: Types.ObjectId };
