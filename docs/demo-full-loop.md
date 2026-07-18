# Full demo loop — kube-memory MCP

End-to-end **deploy → monitor → detect → diagnose → treat → remember → notify** using the **`kube_deploy`** orchestrator or individual MCP tools.

**Primary demo:** [demo-kube-deploy.md](./demo-kube-deploy.md) — payment-service OOM with blue/green mitigation.

**Prerequisites:** local server (`http://localhost:3000/mcp`) for kind clusters; admin `km_*` API key; connectors enabled in dashboard.

---

## Quick start (recommended)

```
/kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml stableManifest=@demos/payment-service/k8s/payment-service-canary-fixed.yaml triggerPagerDuty=true
```

Setup: `./demos/payment-service/scripts/demo-setup.sh`

---

## Connector checklist

| Connector | Required for demo | Config |
|-----------|-------------------|--------|
| Kubernetes | Yes | Kubeconfig (refresh after kind recreate) |
| Slack | Yes (notify) | Bot token + default channel `#k8s-update` |
| GitHub | Recommended | PAT + optional org |
| Prometheus | Recommended | Base URL (+ bearer if auth) |
| ArgoCD | Optional | Base URL + API token |
| PagerDuty | Optional | API key + `defaultServiceId` in config |
| Cognee | Optional | `COGNEE_API_KEY` in `server/.env` for recall — **deploy/incident continue if Cognee is down** |

---

## One-shot incident (recommended)

Use **`incident_open`** — single tool that:

1. Pulls **K8s** events + pod logs
2. Pulls **GitHub** recent commits + open PRs (if `githubRepo` set)
3. Pulls **Prometheus** firing alerts + memory query (if connector enabled)
4. Pulls **ArgoCD** app sync/health (if `argocdApplication` set)
5. Classifies root cause (heuristics)
6. Creates **IncidentRecord** in MongoDB (real incident ID)
7. Stores **memory episode** via `memory_remember`
8. Posts formatted update to **Slack**
9. Optionally creates **PagerDuty** incident (`triggerPagerDuty: true`)

### Copy-paste MCP prompt

```
Use kube-memory MCP only.

1. kube_memory_status — confirm integrations
2. incident_open with:
   - serviceName: payment-simulator
   - namespace: kube-memory-test
   - podName: payment-simulator
   - githubRepo: kube-memory (or your demo repo)
   - argocdApplication: guestbook (if deployed)
   - notifySlack: true
   - slackChannel: C0BE9055RDX (or #k8s-update)
   - rememberInMemory: true
   - triggerPagerDuty: false

3. incident_get with the returned incidentId
4. incident_list limit 5
```

---

## Step-by-step manual flow (for live presentation)

| Step | Question | MCP tool |
|------|----------|----------|
| 1 | What's connected? | `kube_memory_status` |
| 2 | What's failing in the cluster? | `k8s_get_events`, `k8s_pod_logs` |
| 3 | Have we seen this before? | `memory_recall` |
| 4 | Any firing alerts / memory pressure? | `prometheus_list_alerts`, `prometheus_query` |
| 5 | Deploy status? | `argocd_get_application` |
| 6 | Recent commits / fix PRs? | `github_list_commits`, `github_list_pull_requests` |
| 7 | **Open incident** | `incident_open` |
| 8 | Deploy risk? | `predict_risk` |
| 9 | Resolve + notify | `incident_update` status `resolved` |

---

## MCP tools for incidents

| Tool | Role | Purpose |
|------|------|---------|
| `incident_open` | admin | Full orchestration |
| `incident_get` | reader+ | Fetch by ID |
| `incident_list` | reader+ | Recent incidents |
| `incident_update` | admin | Status + Slack notify |
| `pagerduty_create_incident` | admin | Standalone PD create |
