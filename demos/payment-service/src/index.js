import express from "express";
import client from "prom-client";

const PORT = Number(process.env.PORT ?? 8080);
const VERSION = process.env.VERSION ?? "stable";
const MEMORY_LEAK = String(process.env.MEMORY_LEAK ?? "false").toLowerCase() === "true";
const LEAK_DELAY_MS = Number(process.env.LEAK_DELAY_MS ?? 30000);
const LEAK_CHUNK_MB = Number(process.env.LEAK_CHUNK_MB ?? 8);

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const paymentMemoryBytes = new client.Gauge({
  name: "payment_memory_bytes",
  help: "Approximate leaked memory held by payment-service",
  registers: [register],
});

const leakBuffers = [];
let leakStarted = false;

function startMemoryLeak() {
  if (!MEMORY_LEAK || leakStarted) return;
  leakStarted = true;

  setTimeout(() => {
    const interval = setInterval(() => {
      const chunk = Buffer.alloc(LEAK_CHUNK_MB * 1024 * 1024, 1);
      leakBuffers.push(chunk);
      paymentMemoryBytes.set(leakBuffers.length * LEAK_CHUNK_MB * 1024 * 1024);
    }, 2000);

    interval.unref?.();
  }, LEAK_DELAY_MS);
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  httpRequestsTotal.inc({ method: "GET", route: "/health", status: "200" });
  res.json({ status: "ok", version: VERSION, memoryLeak: MEMORY_LEAK });
});

app.post("/api/create-order", (req, res) => {
  if (MEMORY_LEAK && leakStarted) {
    leakBuffers.push(Buffer.alloc(512 * 1024, 1));
    paymentMemoryBytes.set(leakBuffers.length * LEAK_CHUNK_MB * 1024 * 1024);
  }

  const orderId = `ord-${Date.now()}`;
  httpRequestsTotal.inc({ method: "POST", route: "/api/create-order", status: "201" });
  res.status(201).json({
    orderId,
    status: "created",
    payload: req.body ?? {},
  });
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

startMemoryLeak();

app.listen(PORT, () => {
  console.log(`payment-service ${VERSION} listening on ${PORT} (MEMORY_LEAK=${MEMORY_LEAK})`);
});
