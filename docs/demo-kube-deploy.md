# kube-deploy demo script

End-to-end demo: deploy payment-service canary, watch OOM failure, auto-mitigate, open incident, create fix PR, replay traffic, resolve.

## Prerequisites

1. **kind cluster** with images loaded — run:
   ```bash
   chmod +x demos/payment-service/scripts/demo-setup.sh
   ./demos/payment-service/scripts/demo-setup.sh
   ```

2. **kube-memory local server** (recommended — 5 min watch may timeout on Vercel):
   ```bash
   cd server && npm run dev
   ```

3. **Connectors** in dashboard: Kubernetes, Slack, GitHub (write PAT), Prometheus (optional), PagerDuty (optional)

4. **Env** in `server/.env`:
   ```bash
   PAYMENT_SERVICE_GITHUB_OWNER=your-org
   PAYMENT_SERVICE_GITHUB_REPO=payment-service
   COGNEE_API_KEY=...
   MONGODB_URI=...
   ```

5. **On-call roster** — edit [`docs/oncall-roster.csv`](../oncall-roster.csv) with your Slack user ID

## Run the demo

In Cursor with kube-memory MCP configured:

```
/kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml stableManifest=@demos/payment-service/k8s/payment-service-canary-fixed.yaml triggerPagerDuty=true
```

## Expected timeline

| Time | Event |
|------|-------|
| T+0 | Canary deployment applied |
| T+0–20s | Pod Running, health checks pass |
| T+20–40s | Memory leak starts, pod OOMKilled |
| T+40s | `kube_deploy` detects failure |
| T+45s | Service routed to stable; canary deleted |
| T+50s | Incident opened; Slack alert with on-call mention |
| T+55s | Fix PR created in payment-service repo |
| T+60s | Slack thread updated with PR link |
| T+65s | Traffic replay job runs against stable services |
| T+75s | Incident resolved; Cognee episode stored |

## What to show judges

1. **Cursor command** — single `/kube-deploy` invocation
2. **Slack** — incident alert tagging on-call + thread with PR link
3. **PagerDuty** — incident (if enabled)
4. **GitHub** — automated fix PR from kube-memory bot
5. **Cognee** — similar past incidents in incident Slack message
6. **Stable traffic** — order-api returns 201 again after mitigation

## Manual verification

```bash
kubectl get pods -n payment-demo
kubectl get svc payment-service -n payment-demo -o yaml | grep version
curl -s http://localhost:8081/health  # if port-forward order-api
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| MCP timeout | Use local server (`http://localhost:3000/mcp`), not prod Vercel |
| `kube_deploy` failed at start with `fetch failed` | Cognee unreachable — update server: Cognee failures are skipped; restart `npm run dev` |
| No fix PR | Set `PAYMENT_SERVICE_GITHUB_*` env; PAT needs repo write |
| On-call not tagged | Update `docs/oncall-roster.csv` slack_user_id |
| OOM too fast/slow | Tune `LEAK_DELAY_MS` in canary manifest |
| Cognee recall empty | Optional — workflow continues; fix `COGNEE_API_KEY` / network for memory features |

Full MCP reference: [mcp-tools.md](./mcp-tools.md)
