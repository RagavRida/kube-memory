# kube-memory API Reference

Base URL (local): `http://localhost:3000`

Browse all endpoints interactively at **`GET /`** (HTML) or **`GET /?format=json`** (JSON catalog).

All JSON request bodies use `Content-Type: application/json`.

---

## Authentication

kube-memory uses two credential types depending on the surface:

| Credential | Header | Used for |
|------------|--------|----------|
| **JWT session token** | `Authorization: Bearer <jwt>` | Dashboard routes (`/auth/me`, `/connectors`, `/api-keys`) |
| **Workspace API key** | `Authorization: Bearer km_<hex>` | MCP, `/status`, `/ingest`, `/memory/query` |
| **Bootstrap key** | `Authorization: Bearer <MASTER_API_KEY>` | Dev-only when no workspace keys exist |
| **Cron secret** | `Authorization: Bearer <CRON_SECRET>` | `/api/cron/improve` (when `CRON_SECRET` is set) |

**Notes**

- JWT tokens do **not** start with `km_`. Session middleware rejects `km_*` tokens.
- API keys are workspace-scoped. Roles: `reader` (read-only MCP/REST) or `admin` (write/forget/ingest).
- Raw API keys are returned **once** on creation. They are stored as scrypt hashes server-side.

---

## Health & readiness

### `GET /health`

Liveness probe. No authentication.

**Response `200`**

```json
{
  "status": "ok",
  "service": "kube-memory",
  "timestamp": "2026-06-27T12:00:00.000Z"
}
```

---

### `GET /ready`

Readiness probe. Checks MongoDB and Cognee configuration.

**Response `200`** (ready) or **`503`** (degraded)

```json
{
  "status": "ready",
  "checks": {
    "mongo": true,
    "cognee": true,
    "kubernetes": false
  }
}
```

---

## Workspace API (API key auth)

### `GET /status`

Workspace summary and integration flags. Requires API key.

**Headers**

```
Authorization: Bearer km_abc123...
```

**Response `200`**

```json
{
  "workspace": {
    "slug": "alice-a1b2c3",
    "name": "Alice's workspace",
    "cogneeDataset": "ws_alice_a1b2c3",
    "retentionDays": 90
  },
  "integrations": {
    "cognee": true,
    "kubernetes": true,
    "mongo": true
  },
  "stats": {
    "connectors": 2,
    "memoryEvents": 14
  }
}
```

---

### `POST /ingest`

Ingest a structured DevOps episode into memory. **Admin API key required.**

Accepts a full graph episode or enriches one from log text via heuristic classification.

**Request**

```json
{
  "episode": {
    "entity": "Incident",
    "service": {
      "name": "payment-api",
      "team": "payments",
      "criticality": "high"
    },
    "deployment": {
      "timestamp": "2026-06-27T10:00:00Z",
      "imageTag": "v1.2.3",
      "namespace": "prod"
    },
    "incident": {
      "time": "2026-06-27T10:05:00Z",
      "severity": "P1",
      "status": "resolved"
    },
    "rootCause": {
      "category": "Resource Limit",
      "description": "OOMKilled — container exceeded 256Mi limit"
    },
    "fixAction": {
      "type": "config-change",
      "description": "Raised memory limit to 512Mi"
    },
    "relations": [
      "Incident-resolvedBy-FixAction"
    ]
  },
  "datasetName": "ws_alice_a1b2c3",
  "classifyFromLogs": false,
  "logText": "optional raw log text for classification"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `episode` | object | Yes | Structured memory episode (see [Memory episode schema](#memory-episode-schema)) |
| `datasetName` | string | No | Defaults to workspace `cogneeDataset` |
| `classifyFromLogs` | boolean | No | When `true`, runs heuristics on `logText` to infer `rootCause` |
| `logText` | string | No | Raw logs for classification or `errorLogSnippet` |

**Response `202`**

```json
{
  "status": "accepted",
  "recordId": "665f1a2b3c4d5e6f7a8b9c0d",
  "failureCategory": "Resource Limit",
  "datasetName": "ws_alice_a1b2c3"
}
```

---

### `POST /memory/query`

Semantic recall over the workspace memory graph. Requires API key (`reader` or `admin`).

**Request**

```json
{
  "query": "payment-api OOMKilled memory limit fix",
  "topK": 10,
  "sessionId": "optional-session-id",
  "datasetName": "ws_alice_a1b2c3"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `query` | string | Yes | — | Natural-language search query |
| `topK` | integer | No | `10` | Max results (1–100) |
| `sessionId` | string | No | — | Optional Cognee session scope |
| `datasetName` | string | No | workspace default | Target dataset |

**Response `200`**

```json
{
  "query": "payment-api OOMKilled memory limit fix",
  "datasetName": "ws_alice_a1b2c3",
  "matches": [
    {
      "source": "cognee",
      "text": "DevOps memory episode for service payment-api...",
      "raw": {}
    }
  ]
}
```

---

## Dashboard auth (JWT)

Obtain a JWT via register or login. Pass it on all dashboard routes.

### `POST /auth/register`

Create a user, workspace, and session token.

**Request**

```json
{
  "email": "you@example.com",
  "password": "securepass1",
  "name": "Your Name"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Min 8 characters |
| `name` | string | Yes | 1–120 characters |

**Response `201`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "665f...",
    "email": "you@example.com",
    "name": "Your Name"
  },
  "workspace": {
    "id": "665f...",
    "slug": "you-a1b2c3",
    "name": "Your Name's workspace",
    "cogneeDataset": "ws_you_a1b2c3"
  }
}
```

**Errors:** `409` if email already registered.

---

### `POST /auth/login`

**Request**

```json
{
  "email": "you@example.com",
  "password": "securepass1"
}
```

**Response `200`** — same shape as register.

**Errors:** `401` `{ "error": "Invalid credentials" }`

---

### `GET /auth/me`

Return the current session user and workspace. Requires JWT.

**Response `200`**

```json
{
  "user": {
    "id": "665f...",
    "email": "you@example.com",
    "name": "Your Name"
  },
  "workspace": {
    "id": "665f...",
    "slug": "you-a1b2c3",
    "name": "Your Name's workspace",
    "cogneeDataset": "ws_you_a1b2c3"
  }
}
```

---

### `POST /auth/logout`

Stateless logout acknowledgement. Client clears stored JWT.

**Response `200`**

```json
{ "status": "ok" }
```

---

### `GET /auth/github`

Redirect to GitHub OAuth. Requires `GITHUB_CLIENT_ID` and related env vars.

**Response:** `302` redirect to GitHub, or `503` if OAuth is not configured.

---

### `GET /auth/github/callback`

Server-side OAuth callback (GitHub → server). Exchanges code, upserts user, redirects to client:

```
http://localhost:5173/auth/github/callback?token=<jwt>
```

The client stores the JWT and calls `/auth/me`.

---

## Connectors (JWT, workspace owner)

Connector secrets are encrypted at rest. List/upsert responses **never** return decrypted secrets.

Supported types: `kubernetes`, `github`, `slack`, `pagerduty`, `prometheus`, `argocd`, `gcp`

### `GET /connectors`

List all connector types for the workspace.

**Response `200`**

```json
{
  "connectors": {
    "kubernetes": {
      "type": "kubernetes",
      "enabled": true,
      "config": {},
      "healthStatus": "healthy",
      "configured": true,
      "updatedAt": "2026-06-27T12:00:00.000Z"
    },
    "github": {
      "type": "github",
      "enabled": false,
      "config": {},
      "healthStatus": "healthy",
      "configured": false
    }
  }
}
```

---

### `PUT /connectors/:type`

Create or update a connector. **Workspace owner required.**

**Path:** `:type` — one of the supported connector types.

**Request — Kubernetes**

```json
{
  "enabled": true,
  "config": {},
  "secret": "apiVersion: v1\nkind: Config\n..."
}
```

**Request — GitHub**

```json
{
  "enabled": true,
  "config": { "org": "my-org" },
  "secret": "ghp_xxxxxxxxxxxx"
}
```

**Request — Slack**

```json
{
  "enabled": true,
  "config": { "channel": "#incidents" },
  "secret": "xoxb-xxxxxxxxxxxx"
}
```

**Request — PagerDuty**

```json
{
  "enabled": true,
  "config": {},
  "secret": "your-pagerduty-api-key"
}
```

**Request — Prometheus / ArgoCD**

```json
{
  "enabled": true,
  "config": { "baseUrl": "https://prometheus.example.com" },
  "secret": "bearer-token-or-api-key"
}
```

**Request — Google Cloud**

Google Cloud uses OAuth for credentials. Use the OAuth endpoints below to connect; `PUT` is only needed to update `config` (e.g. `projectId`) or toggle `enabled` after OAuth.

```json
{
  "enabled": true,
  "config": { "projectId": "my-gcp-project" }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | No | Default `true` |
| `config` | object | No | Non-secret settings (org, channel, baseUrl, projectId) |
| `secret` | string | No | Credential; omit to keep existing encrypted value |

**Response `200`**

```json
{
  "type": "kubernetes",
  "enabled": true,
  "config": {},
  "healthStatus": "healthy",
  "configured": true
}
```

**Errors:** `503` if `CONNECTOR_ENCRYPTION_KEY` is not set when providing `secret`.

---

### `DELETE /connectors/:type`

Remove a connector configuration. **Workspace owner required.**

**Response `200`**

```json
{ "status": "ok" }
```

---

### `GET /connectors/gcp/oauth/start`

Start Google Cloud OAuth for the workspace. **Workspace owner required.**

**Query:** `projectId` (required) — default GCP project stored in connector config.

**Response `200`**

```json
{ "url": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

**Errors:** `400` if `projectId` missing; `503` if GCP OAuth env vars are not configured.

---

### `GET /connectors/gcp/oauth/callback`

OAuth callback from Google (public). Exchanges the authorization code for tokens, encrypts and stores them, then redirects to the client:

`{CLIENT_URL}/dashboard/integrations?gcp=connected` or `?gcp=error`

**Server env (required for GCP connector):**

| Variable | Description |
|----------|-------------|
| `GCP_OAUTH_CLIENT_ID` | Google OAuth 2.0 Web client ID |
| `GCP_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `GCP_OAUTH_CALLBACK_URL` | Must match authorized redirect URI in Google Cloud Console (e.g. `http://localhost:3000/connectors/gcp/oauth/callback`) |

Enable **Compute Engine API** in the GCP project and configure the OAuth consent screen with scope `compute.readonly`.

---

### `POST /connectors/:type/test`

Run a lightweight connectivity check using stored credentials. **Workspace owner required.**

**Response `200`**

```json
{
  "ok": true,
  "message": "Kubernetes connection successful"
}
```

```json
{
  "ok": false,
  "message": "Connector is not configured"
}
```

---

## API keys (JWT, workspace owner)

### `GET /api-keys`

List API key metadata (no raw keys).

**Response `200`**

```json
{
  "keys": [
    {
      "id": "665f...",
      "prefix": "km_a1b2c",
      "role": "reader",
      "label": "Cursor laptop",
      "createdAt": "2026-06-27T12:00:00.000Z",
      "lastUsedAt": "2026-06-27T14:30:00.000Z",
      "expiresAt": null
    }
  ]
}
```

---

### `POST /api-keys`

Create a new workspace API key. **Workspace owner required.** Raw key returned once.

**Request**

```json
{
  "label": "Cursor laptop",
  "role": "reader"
}
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `label` | string | Yes | 1–120 characters |
| `role` | string | No | `reader` (default) or `admin` |

**Response `201`**

```json
{
  "id": "665f...",
  "key": "km_abc123def456...",
  "prefix": "km_abc1",
  "role": "reader",
  "label": "Cursor laptop"
}
```

---

### `DELETE /api-keys/:id`

Revoke an API key. **Workspace owner required.**

**Response `200`**

```json
{ "status": "ok" }
```

**Errors:** `404` if key not found in workspace.

---

## MCP (Streamable HTTP)

### `POST /mcp`

Model Context Protocol endpoint for AI clients (Cursor, VS Code, Claude Desktop). Requires workspace API key.

**Headers**

```
Authorization: Bearer km_abc123...
Content-Type: application/json
Accept: application/json, text/event-stream
```

Uses JSON-RPC 2.0 over Streamable HTTP. Clients typically discover tools via `tools/list` and invoke via `tools/call`.

**Example — list tools**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Example — call `memory_recall`**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "memory_recall",
    "arguments": {
      "query": "payment-api OOMKilled fix",
      "topK": 5
    }
  }
}
```

### MCP tools

| Tool | Role | Connector | Description |
|------|------|-----------|-------------|
| `memory_remember` | admin | — | Store incident/deployment/fix in memory |
| `memory_recall` | reader+ | — | Semantic search over past episodes |
| `memory_forget` | admin | — | Remove stale/sensitive memory from dataset |
| `predict_risk` | reader+ | — | Score deploy risk from recall similarity |
| `k8s_pod_logs` | reader+ | kubernetes | Read pod logs |
| `k8s_get_events` | reader+ | kubernetes | List cluster/namespace events |
| `k8s_get_pod` | reader+ | kubernetes | Get pod status and container state |
| `k8s_apply_manifest` | admin | kubernetes | Apply YAML manifest to cluster |
| `k8s_delete_pod` | admin | kubernetes | Delete a pod in a namespace |
| `kube_deploy` | admin | kubernetes | Full deploy, monitor, and incident orchestrator |
| `replay_impacted_traffic` | admin | kubernetes | Replay HTTP on stable services after outage |
| `github_list_issues` | reader+ | github | List GitHub issues for a repo |
| `github_list_pull_requests` | reader+ | github | List pull requests |
| `github_list_commits` | reader+ | github | List commits on a branch or path |
| `github_get_pull_request` | reader+ | github | Fetch a single pull request |
| `github_create_branch` | admin | github | Create a GitHub branch |
| `github_create_or_update_file` | admin | github | Create or update a file in a repo |
| `github_create_pull_request` | admin | github | Open a GitHub pull request |
| `slack_get_history` | reader+ | slack | Fetch recent Slack channel messages |
| `slack_get_channel_info` | reader+ | slack | Get Slack channel metadata |
| `slack_get_replies` | reader+ | slack | Fetch replies for a Slack thread |
| `slack_list_channels` | reader+ | slack | List accessible Slack channels |
| `slack_list_users` | reader+ | slack | List Slack users visible to the bot |
| `slack_post_message` | admin | slack | Post a message to Slack |
| `pagerduty_list_incidents` | reader+ | pagerduty | List PagerDuty incidents |
| `pagerduty_get_incident` | reader+ | pagerduty | Fetch incident details |
| `pagerduty_list_services` | reader+ | pagerduty | List PagerDuty services |
| `pagerduty_get_incident_log_entries` | reader+ | pagerduty | Fetch incident timeline log entries |
| `pagerduty_list_incident_notes` | reader+ | pagerduty | List notes on a PagerDuty incident |
| `pagerduty_list_oncalls` | reader+ | pagerduty | List who is currently on call |
| `pagerduty_list_users` | reader+ | pagerduty | List PagerDuty users |
| `pagerduty_create_incident` | admin | pagerduty | Create a PagerDuty incident |
| `pagerduty_add_incident_note` | admin | pagerduty | Add note to PagerDuty incident |
| `pagerduty_resolve_incident` | admin | pagerduty | Resolve PagerDuty incident |
| `prometheus_query` | reader+ | prometheus | PromQL instant query |
| `prometheus_query_range` | reader+ | prometheus | PromQL range query |
| `prometheus_list_alerts` | reader+ | prometheus | List firing alerts |
| `prometheus_list_targets` | reader+ | prometheus | List scrape targets |
| `prometheus_list_rules` | reader+ | prometheus | List alerting and recording rules |
| `prometheus_list_alertmanagers` | reader+ | prometheus | List active Alertmanager endpoints |
| `prometheus_list_labels` | reader+ | prometheus | List metric label names |
| `prometheus_list_label_values` | reader+ | prometheus | List values for a metric label |
| `argocd_list_applications` | reader+ | argocd | List GitOps applications |
| `argocd_get_application` | reader+ | argocd | Get application sync/health |
| `argocd_get_app_history` | reader+ | argocd | List deployment history |
| `argocd_list_app_events` | reader+ | argocd | List sync and deploy events |
| `argocd_get_app_resource_tree` | reader+ | argocd | Fetch application resource tree |
| `argocd_list_projects` | reader+ | argocd | List ArgoCD projects |
| `argocd_list_repositories` | reader+ | argocd | List connected Git repositories |
| `argocd_sync_application` | admin | argocd | Trigger application sync |
| `argocd_rollback_application` | admin | argocd | Rollback to prior revision |
| `gcp_list_instances` | reader+ | gcp | List Compute Engine VM instances |
| `gcp_get_instance` | reader+ | gcp | Get a single Compute Engine VM instance |
| `gcp_list_storage_buckets` | reader+ | gcp | List Cloud Storage buckets |
| `gcp_get_storage_bucket` | reader+ | gcp | Get metadata for a single Cloud Storage bucket |
| `gcp_list_bucket_objects` | reader+ | gcp | List objects stored in a Cloud Storage bucket |
| `gcp_query_logs` | reader+ | gcp | Query Cloud Logging entries |
| `gcp_list_metric_descriptors` | reader+ | gcp | List Cloud Monitoring metric descriptors |
| `gcp_query_metrics` | reader+ | gcp | Query Cloud Monitoring metrics |

Connector tools require the matching integration to be **configured and enabled** in the dashboard. Write tools (`slack_post_message`, `argocd_sync_application`, `argocd_rollback_application`) require **admin** API key role.

#### `gcp_list_instances`

```json
{
  "project": "optional — defaults to connector config projectId",
  "zone": "optional — omit to list across all zones"
}
```

#### `gcp_get_instance`

```json
{
  "project": "optional — defaults to connector config projectId",
  "zone": "us-central1-a",
  "instance": "my-vm"
}
```

#### `gcp_list_storage_buckets`

```json
{
  "project": "optional — defaults to connector config projectId"
}
```

#### `gcp_get_storage_bucket`

```json
{
  "bucket": "my-bucket"
}
```

#### `gcp_list_bucket_objects`

```json
{
  "bucket": "my-bucket",
  "prefix": "optional/path/",
  "maxResults": 100
}
```

#### `gcp_query_logs`

```json
{
  "project": "optional — defaults to connector config projectId",
  "severity": "ERROR",
  "resourceType": "k8s_container",
  "search": "OOMKilled",
  "from": "2026-06-27T00:00:00Z",
  "to": "2026-06-27T12:00:00Z",
  "pageSize": 50,
  "order": "desc"
}
```

#### `gcp_list_metric_descriptors`

```json
{
  "project": "optional — defaults to connector config projectId",
  "filter": "metric.type = starts_with(\"compute.googleapis.com/\")",
  "pageSize": 100
}
```

#### `gcp_query_metrics`

```json
{
  "project": "optional — defaults to connector config projectId",
  "metricType": "compute.googleapis.com/instance/cpu/utilization",
  "resourceType": "gce_instance",
  "minutes": 60,
  "pageSize": 100
}
```

#### `memory_remember`

```json
{
  "episode": { "...": "see Memory episode schema" },
  "text": "Free-form incident text (alternative to episode)",
  "datasetName": "optional override"
}
```

Either `episode` or `text` is required.

#### `memory_recall`

```json
{
  "query": "notification-service CrashLoopBackOff",
  "topK": 10,
  "sessionId": "optional",
  "datasetName": "optional"
}
```

#### `memory_forget`

```json
{
  "datasetName": "optional",
  "everything": false
}
```

#### `predict_risk`

```json
{
  "serviceName": "payment-api",
  "query": "optional custom recall query",
  "datasetName": "optional"
}
```

**Response shape (tool result)**

```json
{
  "score": 0.72,
  "reason": "Found 3 similar past events for payment-api.",
  "matchCount": 3
}
```

#### `k8s_pod_logs`

```json
{
  "name": "payment-api-7f8c9d-xxxxx",
  "namespace": "default",
  "container": "app",
  "tail": 100
}
```

#### `k8s_get_events`

```json
{
  "namespace": "default",
  "fieldSelector": "involvedObject.name=payment-api-7f8c9d"
}
```

#### `k8s_get_pod`

```json
{
  "name": "payment-simulator",
  "namespace": "kube-memory-test"
}
```

#### `k8s_apply_manifest`

```json
{
  "manifest": "apiVersion: v1\nkind: Pod\nmetadata:\n  name: payment-simulator\n  namespace: kube-memory-test\n...",
  "namespace": "kube-memory-test",
  "dryRun": false
}
```

#### `k8s_delete_pod`

```json
{
  "name": "payment-simulator-old",
  "namespace": "kube-memory-test"
}
```

Kubernetes tools use the workspace **kubernetes** connector kubeconfig when configured; otherwise they fall back to `KUBECONFIG_BASE64`. Write tools (`k8s_apply_manifest`, `k8s_delete_pod`) require **admin** API key role.

#### GitHub tools

```json
{ "owner": "my-org", "repo": "payment-api", "state": "open", "labels": "bug", "perPage": 30 }
```

#### Slack tools

```json
{ "channel": "#incidents", "limit": 50 }
```

```json
{ "channel": "C12345678" }
```

```json
{ "channel": "C12345678", "threadTs": "1719000000.000100", "limit": 25 }
```

```json
{ "limit": 100 }
```

```json
{ "channel": "#incidents", "text": "New OOM fix is deployed" }
```

If `channel` is omitted for history or post-message calls, the default channel from the Slack connector config is used. `slack_get_channel_info`, `slack_get_replies`, and `slack_list_users` are read-only helper tools for channel and membership context.

#### PagerDuty tools

```json
{ "statuses": ["triggered", "acknowledged"], "serviceIds": ["PXXXXXX"], "limit": 25 }
```

#### Prometheus tools

```json
{ "query": "rate(http_requests_total[5m])", "start": "1719000000", "end": "1719003600", "step": "60s" }
```

#### ArgoCD tools

```json
{ "name": "payment-api", "revision": "abc123", "prune": false }
```

For rollback, pass the history `id` from `argocd_get_app_history`.

---

## Cron

### `GET /api/cron/improve`

Trigger Cognee `improve()` for a dataset. Intended for Vercel Cron or scheduled jobs.

**Query parameters**

| Param | Description |
|-------|-------------|
| `dataset` | Dataset name (default: `main_dataset`) |

**Headers** (when `CRON_SECRET` is set)

```
Authorization: Bearer <CRON_SECRET>
```

**Response `200`**

```json
{
  "status": "ok",
  "datasetName": "ws_alice_a1b2c3",
  "result": {}
}
```

---

## Memory episode schema

Used by `/ingest` and `memory_remember`.

```json
{
  "entity": "Incident",
  "service": {
    "name": "payment-api",
    "team": "payments",
    "criticality": "high"
  },
  "deployment": {
    "timestamp": "2026-06-27T10:00:00Z",
    "imageTag": "v1.2.3",
    "cluster": "prod-us-east",
    "namespace": "prod"
  },
  "incident": {
    "time": "2026-06-27T10:05:00Z",
    "severity": "P1",
    "status": "resolved"
  },
  "rootCause": {
    "category": "Resource Limit",
    "description": "OOMKilled"
  },
  "fixAction": {
    "type": "config-change",
    "description": "Raised memory limit to 512Mi",
    "appliedAt": "2026-06-27T10:15:00Z"
  },
  "person": {
    "name": "On-call SRE",
    "email": "sre@example.com"
  },
  "commit": {
    "sha": "abc1234",
    "message": "fix: increase memory limit",
    "repository": "org/payment-api"
  },
  "errorLogSnippet": {
    "source": "kubectl logs",
    "snippet": "Killed\\nExit code 137"
  },
  "relations": ["Incident-resolvedBy-FixAction"],
  "rawText": "optional free-form backup"
}
```

**`rootCause.category` values:** `Resource Limit`, `Configuration Error`, `Dependency Failure`, `Network / DNS`, `CrashLoop / App Exception`, `Timeout / Latency`, `Permission / Auth`, `CI/CD Pipeline`, `Cluster Issues`, `Agent Error`, `Unknown`

**`fixAction.type` values:** `rollback`, `patch`, `config-change`, `scale-up`, `restart`, `other`

**`incident.status` values:** `open`, `resolved`, `escalated`

---

## Error responses

| Status | Meaning |
|--------|---------|
| `400` | Invalid request body or parameters |
| `401` | Missing or invalid credentials |
| `403` | Insufficient role (e.g. reader calling admin-only route) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email) |
| `503` | Service misconfiguration (missing encryption key, Cognee, etc.) |
| `500` | Internal server error |

Generic error body:

```json
{ "error": "Human-readable message" }
```

Validation errors from Zod may include field details in the message.

---

## Environment variables

See [`.env.example`](./.env.example) for the full list. Minimum for local development:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Workspace and key storage |
| `COGNEE_BASE_URL` / `COGNEE_API_KEY` | Memory graph |
| `API_KEY_SALT` | API key hashing |
| `JWT_SECRET` | Dashboard session tokens |
| `CONNECTOR_ENCRYPTION_KEY` | Connector secret encryption (min 32 chars) |
| `CORS_ORIGIN` / `CLIENT_URL` | Dashboard CORS and OAuth redirects |

---

## Quick curl examples

```bash
# Health
curl -s http://localhost:3000/health

# Register
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepass1","name":"You"}'

# Create API key (use JWT from register response)
curl -s -X POST http://localhost:3000/api-keys \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"label":"dev","role":"admin"}'

# Recall memory
curl -s -X POST http://localhost:3000/memory/query \
  -H "Authorization: Bearer km_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"OOMKilled payment-api"}'
```
