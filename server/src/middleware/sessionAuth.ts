import type { NextFunction, Request, Response } from "express";
import { connectMongo } from "../db/connection.js";
import { User, type UserDoc } from "../db/models/User.js";
import { Workspace, type WorkspaceDoc } from "../db/models/Workspace.js";
import { verifyToken } from "../utils/jwt.js";

export interface SessionContext {
  user: UserDoc;
  workspace: WorkspaceDoc;
}

declare global {
  namespace Express {
    interface Request {
      session?: SessionContext;
    }
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (token.startsWith("km_")) return null;
  return token;
}

export async function sessionAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(token);
    await connectMongo();

    const user = await User.findById(payload.sub);
    if (!user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    const workspace = await Workspace.findById(payload.workspaceId);
    if (!workspace) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    req.session = { user, workspace };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export function requireSessionAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.user.role !== "owner") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
