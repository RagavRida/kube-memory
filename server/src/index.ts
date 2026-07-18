import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import cors from "cors";
import type { Express, Request, Response } from "express";
import { authStorage } from "./context/requestContext.js";
import { getEnv } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { createMcpServer } from "./mcp/server.js";
import { apiKeysRouter } from "./routes/apiKeys.js";
import { authRouter } from "./routes/auth.js";
import { connectorsRouter } from "./routes/connectors.js";
import { cronRouter } from "./routes/cron.js";
import { healthRouter } from "./routes/health.js";
import { ingestRouter } from "./routes/ingest.js";
import { memoryRouter } from "./routes/memory.js";
import { rootRouter } from "./routes/root.js";
import { statusRouter } from "./routes/status.js";
import {
  resolveAuth,
} from "./middleware/auth.js";

const mcpServer = createMcpServer();
const mcpTransport = new NodeStreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});

let mcpTransportReady: Promise<void> | null = null;

function ensureMcpTransportReady(): Promise<void> {
  if (!mcpTransportReady) {
    mcpTransportReady = mcpServer.connect(mcpTransport);
  }
  return mcpTransportReady;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export function createApp(): Express {
  const env = getEnv();
  const app = createMcpExpressApp({
    host: "0.0.0.0",
    ...(process.env.VERCEL !== "1" && {
      allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
    }),
    jsonLimit: "2mb",
  });

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(rootRouter);
  app.use(healthRouter);
  app.use(statusRouter);
  app.use(ingestRouter);
  app.use(memoryRouter);
  app.use(cronRouter);
  app.use(authRouter);
  app.use(connectorsRouter);
  app.use(apiKeysRouter);

  app.all("/mcp", async (req: Request, res: Response) => {
    const auth = await resolveAuth(extractBearerToken(req));
    if (!auth) {
      if (!res.headersSent) {
        res.status(401).json({ error: "Missing or invalid Authorization header" });
      }
      return;
    }

    try {
      await ensureMcpTransportReady();
      await authStorage.run(auth, async () => {
        await mcpTransport.handleRequest(req, res, req.body);
      });
    } catch (error) {
      if (!res.headersSent) {
        const message = error instanceof Error ? error.message : "MCP request failed";
        res.status(500).json({ error: message });
      }
    }
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

if (process.env.VERCEL !== "1") {
  const { PORT } = getEnv();
  app.listen(PORT, () => {
    console.log(`kube-memory server listening on port ${PORT}`);
  });
}

export default app;
