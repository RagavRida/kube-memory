import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export const memoryEventStatuses = ["pending", "indexed", "failed"] as const;
export type MemoryEventStatus = (typeof memoryEventStatuses)[number];

export interface IMemoryEventRecord extends Document {
  workspaceId: Types.ObjectId;
  cogneeDataset: string;
  payload: Record<string, unknown>;
  status: MemoryEventStatus;
  failureCategory?: string;
  cogneeDataId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const memoryEventRecordSchema = new Schema<IMemoryEventRecord>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    cogneeDataset: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: memoryEventStatuses, default: "pending", index: true },
    failureCategory: { type: String },
    cogneeDataId: { type: String },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

export const MemoryEventRecord: Model<IMemoryEventRecord> =
  mongoose.models.MemoryEventRecord ??
  mongoose.model<IMemoryEventRecord>("MemoryEventRecord", memoryEventRecordSchema);

export type MemoryEventRecordDoc = IMemoryEventRecord & { _id: Types.ObjectId };
