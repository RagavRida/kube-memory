import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthContext } from "../middleware/auth.js";

export const authStorage = new AsyncLocalStorage<AuthContext>();

export function getAuthContext(): AuthContext | undefined {
  return authStorage.getStore();
}

export function requireAuthContext(): AuthContext {
  const auth = getAuthContext();
  if (!auth) {
    throw new Error("Authentication required");
  }
  return auth;
}
