import type { UserDoc } from "../../db/models/User.js";
import type { WorkspaceDoc } from "../../db/models/Workspace.js";
import { connectMongo } from "../../db/connection.js";
import { User } from "../../db/models/User.js";
import { Workspace } from "../../db/models/Workspace.js";
import { hashPassword, slugifyEmail } from "../../utils/crypto.js";
import { signToken } from "../../utils/jwt.js";
import { getEnv, requireApiKeySalt } from "../../config/env.js";

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  workspace: {
    id: string;
    slug: string;
    name: string;
    cogneeDataset: string;
  };
}

function toAuthResponse(user: UserDoc, workspace: WorkspaceDoc, token: string): AuthResponse {
  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    workspace: {
      id: workspace._id.toString(),
      slug: workspace.slug,
      name: workspace.name,
      cogneeDataset: workspace.cogneeDataset,
    },
  };
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthResponse> {
  await connectMongo();

  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw new Error("Email already registered");
  }

  const slug = slugifyEmail(input.email);
  const workspace = await Workspace.create({
    slug,
    name: `${input.name}'s workspace`,
    cogneeDataset: `ws_${slug.replace(/-/g, "_")}`,
  });

  const salt = requireApiKeySalt();
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash: hashPassword(input.password, salt),
    name: input.name,
    workspaceId: workspace._id,
    role: "owner",
  });

  workspace.ownerId = user._id;
  await workspace.save();

  const token = signToken({
    sub: user._id.toString(),
    workspaceId: workspace._id.toString(),
    email: user.email,
  });

  return toAuthResponse(user, workspace, token);
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  await connectMongo();
  const salt = requireApiKeySalt();

  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (!user?.passwordHash) {
    throw new Error("Invalid credentials");
  }

  const { verifyPassword } = await import("../../utils/crypto.js");
  if (!verifyPassword(input.password, salt, user.passwordHash)) {
    throw new Error("Invalid credentials");
  }

  const workspace = await Workspace.findById(user.workspaceId);
  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const token = signToken({
    sub: user._id.toString(),
    workspaceId: workspace._id.toString(),
    email: user.email,
  });

  return toAuthResponse(user, workspace, token);
}

export async function findOrCreateGitHubUser(profile: {
  id: string;
  email?: string;
  displayName?: string;
  username?: string;
}): Promise<AuthResponse> {
  await connectMongo();

  let user = await User.findOne({ githubId: profile.id });
  if (user) {
    const workspace = await Workspace.findById(user.workspaceId);
    if (!workspace) throw new Error("Workspace not found");
    const token = signToken({
      sub: user._id.toString(),
      workspaceId: workspace._id.toString(),
      email: user.email,
    });
    return toAuthResponse(user, workspace, token);
  }

  const email = profile.email?.toLowerCase();
  if (email) {
    user = await User.findOne({ email });
    if (user) {
      user.githubId = profile.id;
      await user.save();
      const workspace = await Workspace.findById(user.workspaceId);
      if (!workspace) throw new Error("Workspace not found");
      const token = signToken({
        sub: user._id.toString(),
        workspaceId: workspace._id.toString(),
        email: user.email,
      });
      return toAuthResponse(user, workspace, token);
    }
  }

  const fallbackEmail = email ?? `${profile.username ?? profile.id}@github.local`;
  const name = profile.displayName ?? profile.username ?? "GitHub User";
  const slug = slugifyEmail(fallbackEmail);

  const workspace = await Workspace.create({
    slug,
    name: `${name}'s workspace`,
    cogneeDataset: `ws_${slug.replace(/-/g, "_")}`,
  });

  user = await User.create({
    email: fallbackEmail,
    name,
    githubId: profile.id,
    workspaceId: workspace._id,
    role: "owner",
  });

  workspace.ownerId = user._id;
  await workspace.save();

  const token = signToken({
    sub: user._id.toString(),
    workspaceId: workspace._id.toString(),
    email: user.email,
  });

  return toAuthResponse(user, workspace, token);
}

export function getGitHubAuthUrl(): string | null {
  const env = getEnv();
  if (!env.GITHUB_CLIENT_ID) return null;
  const callback = encodeURIComponent(env.GITHUB_CALLBACK_URL ?? "");
  const scope = encodeURIComponent("user:email");
  return `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${callback}&scope=${scope}`;
}
