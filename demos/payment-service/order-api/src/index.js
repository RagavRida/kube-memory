import express from "express";
import client from "prom-client";

const PORT = Number(process.env.PORT ?? 8081);
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL ?? "http://payment-service:8080";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

const app = express();
app.use(express.json());

async function paymentHealthy() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`${PAYMENT_URL}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/health", async (_req, res) => {
  const ok = await paymentHealthy();
  const status = ok ? 200 : 503;
  httpRequestsTotal.inc({ method: "GET", route: "/health", status: String(status) });
  res.status(status).json({ status: ok ? "ok" : "degraded", upstream: PAYMENT_URL });
});

app.post("/api/create-order", async (req, res) => {
  const ok = await paymentHealthy();
  if (!ok) {
    httpRequestsTotal.inc({ method: "POST", route: "/api/create-order", status: "500" });
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "POST /api/create-order failed — payment-service unavailable",
      header: req.headers,
      payload: req.body ?? {},
    });
  }

  try {
    const upstream = await fetch(`${PAYMENT_URL}/api/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });
    const body = await upstream.json();
    httpRequestsTotal.inc({
      method: "POST",
      route: "/api/create-order",
      status: String(upstream.status),
    });
    res.status(upstream.status).json(body);
  } catch {
    httpRequestsTotal.inc({ method: "POST", route: "/api/create-order", status: "500" });
    res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
      message: "POST /api/create-order failed — upstream error",
    });
  }
});

app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`order-api listening on ${PORT}, upstream=${PAYMENT_URL}`);
});
