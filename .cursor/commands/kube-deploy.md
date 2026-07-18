# kube-deploy — Deploy, monitor, and respond via kube-memory MCP

You are running the **kube-deploy** workflow: analyze a Kubernetes manifest, deploy through kube-memory MCP, watch pod health for up to 5 minutes, then either complete a success path or execute the full failure/incident path automatically.

## Hard rules

1. Use **kube-memory MCP tools only** for all cluster, GitHub, Slack, PagerDuty, Prometheus, ArgoCD, and memory operations.
2. **Never** run local `kubectl`, `git`, or `curl` to external APIs.
3. Call `kube_memory_status` first. If a required connector is missing, stop and tell the user to connect it at [kube-memory dashboard](https://kube-memory.buildlab.in/).
4. Write tools (`kube_deploy`, `k8s_apply_manifest`, `incident_open`, `slack_post_message`, `github_create_pull_request`) require an **admin** API key.
5. Read the manifest file from the user's message (`@path/to/manifest.yaml`) before calling `kube_deploy`.
6. For demo OOM scenario, also read the fixed manifest (`payment-service-canary-fixed.yaml`) and pass as `stableManifest`.

## Inputs (extract from user message)

| Input | Required | Default |
|-------|----------|---------|
| Manifest path | Yes | — |
| Stable fix manifest path | Recommended (failure path) | `@demos/payment-service/k8s/payment-service-canary-fixed.yaml` |
| `namespace` | No | From manifest `metadata.namespace` |
| `serviceName` | No | From manifest labels / deployment name |
| `githubOwner` / `githubRepo` | No | `PAYMENT_SERVICE_GITHUB_OWNER` / `PAYMENT_SERVICE_GITHUB_REPO` env |
| `slackChannel` | No | Workspace default |
| `triggerPagerDuty` | No | `false` (set `true` for full demo) |
| `watchDurationSec` | No | `120` (use `90` for quick demo; max 600) |

Anything after `/kube-deploy` in the user message is additional context — use it.

---

## Cognee resilience

If Cognee Cloud is unreachable, `kube_deploy` **continues** — risk scoring is skipped (`predict_risk: skipped`), and the deploy/incident pipeline runs normally. Do not abort or fall back to local kubectl when only memory recall fails.

---

## Phase A — Pre-deploy

1. **`kube_memory_status`** — confirm `kubernetes` is enabled (and note Slack, PagerDuty, GitHub, Prometheus availability).
2. **Read the manifest** locally — summarize: kinds, names, namespace, image, CPU/memory limits, `MEMORY_LEAK` env.
3. **Read the stable fix manifest** if provided — you'll pass its contents as `stableManifest` to `kube_deploy`.

---

## Phase B — Deploy and watch (orchestrator)

Call **`kube_deploy`** once with:

```json
{
  "manifest": "<full YAML from canary manifest>",
  "stableManifest": "<full YAML from fixed manifest>",
  "namespace": "payment-demo",
  "serviceName": "payment-service",
  "githubOwner": "<optional>",
  "githubRepo": "<optional>",
  "slackChannel": "<optional>",
  "triggerPagerDuty": true,
  "watchDurationSec": 90,
  "pollIntervalSec": 15
}
```

**While the tool runs**, relay each phase to the user. When it completes, print the full **`actionSummary`** and **`actions`** array from the tool result — do not paraphrase.

| Field | What to show |
|-------|----------------|
| `actions` | Numbered list of every step (scan, apply, watch, mitigate, incident, PR, replay, resolve) |
| `actionSummary` | Markdown summary — paste verbatim for the user |
| `phases` | Watch poll log with timestamps |

| Phase | What to tell the user |
|-------|-------------------------|
| `pre_deploy` | Manifest scan + risk score (or skipped if Cognee down) |
| `apply` | Resources applied |
| `watch` | Pod phase / OOM status every poll |
| `failure` | Failure detected |
| `diagnose` | Logs, Cognee recall, impacted apps |
| `mitigate` | Service routed to stable, canary deleted |
| `incident` | Incident ID + Slack/PD |
| `fix_pr` | Automated fix PR URL |
| `replay` | Traffic replay on stable |
| `resolve` | Incident resolved |
| `success` | Stable for full watch window |

---

## Phase C — Success path (from `kube_deploy` result)

When `outcome === "success"`:

1. Confirm Slack success message was posted by orchestrator.
2. Summarize `memoryRecordId` if present.
3. No incident opened.

---

## Phase D — Failure path (OOM demo)

When `outcome === "failure"`, the orchestrator already ran:

1. **Diagnose** — pod logs, events, Prometheus alerts, Cognee recall
2. **Mitigate** — Service selector → `version: stable`; delete canary pods
3. **Incident** — `incident_open` with on-call mention from [`docs/oncall-roster.csv`](docs/oncall-roster.csv)
4. **Fix PR** — `github_create_pull_request` in payment-service repo (via `stableManifest`)
5. **Slack thread** — PR link posted in incident thread
6. **Replay** — `replay_impacted_traffic` on stable payment-service + order-api
7. **Resolve** — incident updated to `resolved`, episode stored in Cognee

Narrate these steps to the user using the `phases` array from the tool result.

---

## Phase E — Post-run summary

End with:

| Phase | Result |
|-------|--------|
| Pre-deploy | Connectors, risk score |
| Apply | Resources created/updated |
| Pod status | Phase, OOM/crash flags |
| Incident | ID, Slack/PD links, on-call mention |
| Fix PR | URL (if stableManifest provided) |
| Replay | Success/failure counts |
| Memory | Record ID |

---

## Demo prerequisites

- Admin `km_*` API key
- Connectors: Kubernetes, Slack, GitHub (write PAT), Prometheus (optional), PagerDuty (optional)
- Local server recommended for 5-min watch (`localhost:3000/mcp`) — Vercel may timeout
- Run [`demos/payment-service/scripts/demo-setup.sh`](demos/payment-service/scripts/demo-setup.sh) first
- Populate [`docs/oncall-roster.csv`](docs/oncall-roster.csv) with demo engineer Slack ID
- Set in `server/.env`:
  ```
  PAYMENT_SERVICE_GITHUB_OWNER=your-org
  PAYMENT_SERVICE_GITHUB_REPO=payment-service
  ```

## Example

```
/kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml stableManifest=@demos/payment-service/k8s/payment-service-canary-fixed.yaml triggerPagerDuty=true
```

Reference: [docs/demo-kube-deploy.md](docs/demo-kube-deploy.md), [docs/demo-full-loop.md](docs/demo-full-loop.md), [docs/mcp-tools.md](docs/mcp-tools.md).

---

## Note: this file vs MCP

This `.cursor/commands/kube-deploy.md` file is a **Cursor slash-command prompt** — it is not served by the MCP server. The server exposes the **`kube_deploy`** tool via `POST /mcp`. Keep this file in the repo if you want `/kube-deploy` in Cursor; otherwise call `kube_deploy` directly from chat.
