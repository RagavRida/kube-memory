import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  githubId?: string;
  workspaceId: Types.ObjectId;
  role: "owner";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    name: { type: String, required: true },
    githubId: { type: String, unique: true, sparse: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    role: { type: String, enum: ["owner"], default: "owner" },
  },
  { timestamps: true },
);

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", userSchema);

export type UserDoc = IUser & { _id: Types.ObjectId };
