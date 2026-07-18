import jwt, { type SignOptions } from "jsonwebtoken";
import { getEnv } from "../config/env.js";

export interface JwtPayload {
  sub: string;
  workspaceId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  const env = getEnv();
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  const expiresIn = (env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  const env = getEnv();
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
