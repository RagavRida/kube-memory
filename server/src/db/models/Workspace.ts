import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IWorkspace extends Document {
  slug: string;
  name: string;
  cogneeDataset: string;
  retentionDays: number;
  ownerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    cogneeDataset: { type: String, required: true, default: "main_dataset" },
    retentionDays: { type: Number, required: true, default: 90 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace ?? mongoose.model<IWorkspace>("Workspace", workspaceSchema);

export type WorkspaceDoc = IWorkspace & { _id: Types.ObjectId };
