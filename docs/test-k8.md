# Kubernetes integration test — kube-memory MCP

End-to-end guide to validate kube-memory against a real cluster: break a pod on purpose, use MCP to detect → diagnose → treat → remember.

**Manifests:** [`k8s-test/`](./k8s-test/)  
**Dashboard:** [localhost:5173](http://localhost:5173/)  
**MCP:** `http://localhost:3000/mcp`

---

## What you are testing

| MCP tool | Role in the incident loop |
|----------|---------------------------|
| `kube_memory_status` | Confirm Kubernetes connector is enabled |
| `k8s_get_events` | See OOMKilled / CrashLoop / Config errors |
| `k8s_pod_logs` | Read container output before exit |
| `memory_recall` | Ask “have we seen this before?” |
| `memory_remember` | Store symptom, cause, fix, outcome |
| `predict_risk` | Score a redeploy after you “fix” limits |

**Primary mock scenario:** `payment-simulator` OOMKilled in namespace `kube-memory-test` — matches kube-memory’s heuristic classifier (`Resource Limit` → raise memory limits).

---

## Choose your track

| Track | Cluster | kube-memory server | Best for |
|-------|---------|-------------------|----------|
| **A — Local (recommended first)** | kind on your Mac | `localhost:3000` | Learning + full E2E tonight |
| **B — Remote** | GKE / EKS / DO / etc. (public API) | Your API host | Demo / team / hackathon judges |

> **Important:** Prod server on Vercel **cannot** reach a kind cluster on your Mac (`server: https://127.0.0.1:…` in kubeconfig). For kind, use **Track A** or tunnel the API (not covered here).

---

## Track A — Local kind + local server

### Prerequisites

- `kind`, `kubectl`, Docker Desktop running
- kube-memory repo cloned; MongoDB + Cognee env vars in `server/.env` (see [setup.md](./setup.md))
- `km_*` API key from local dashboard or prod workspace (key works against whichever server you point MCP at)

### Step 1 — Create the cluster

```bash
cd /path/to/kube-memory

kind create cluster --name kube-memory-demo
kubectl config use-context kind-kube-memory-demo
kubectl cluster-info
```

### Step 2 — Deploy the failure scenario

```bash
kubectl apply -f docs/k8s-test/namespace.yaml
kubectl apply -f docs/k8s-test/oom-payment-simulator.yaml

# Watch until it fails (OOMKilled or Error)
kubectl get pods -n kube-memory-test -w
```

In another terminal, confirm failure signals (you should see these via MCP too):

```bash
kubectl describe pod payment-simulator -n kube-memory-test | tail -20
kubectl get events -n kube-memory-test --sort-by='.lastTimestamp'
kubectl logs payment-simulator -n kube-memory-test -c payment-api 2>&1 | tail -20
```

**Expected:** `Reason: OOMKilled`, events mentioning memory, container exit 137.

### Step 3 — Start kube-memory locally

```bash
# Terminal 1 — API
cd server && npm run dev

# Terminal 2 — Dashboard (optional but useful)
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → sign in → **Integrations**.

### Step 4 — Connect Kubernetes in the dashboard

1. **Integrations** → **Kubernetes** → **Connect**
2. Paste your kubeconfig:

   ```bash
   # Copy full file to clipboard (Mac)
   cat ~/.kube/config
   ```

   For kind-only config (smaller paste):

   ```bash
   kubectl config view --minify --flatten --context=kind-kube-memory-demo
   ```

3. **Test connection** → must pass (`listNamespace`)
4. **Save** → toggle **Enabled**

5. **API Keys** → create `km_*` key if you don’t have one

### Step 5 — Configure Cursor MCP (local)

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer km_YOUR_KEY_HERE"
      }
    }
  }
}
```

Reload MCP / restart Cursor.

### Step 6 — Run the E2E MCP script (copy into chat)

**Act 1 — Detect & diagnose**

```
Use kube-memory MCP only. Do not run kubectl or git locally.

1. Call kube_memory_status and confirm kubernetes is active.
2. Call k8s_get_events with namespace "kube-memory-test".
3. Call k8s_pod_logs for pod "payment-simulator" in namespace "kube-memory-test", tail 100.
4. Summarize: what failed, root cause category, and recommended fix.
```

**Act 2 — Remember the incident**

```
Use kube-memory MCP only.

Call memory_remember with this episode:
{
  "episode": {
    "entity": "Incident",
    "service": { "name": "payment-simulator", "criticality": "high" },
    "incident": { "time": "<ISO now>", "severity": "high", "status": "open" },
    "rootCause": {
      "category": "Resource Limit",
      "description": "OOMKilled — stress container exceeded 64Mi memory limit"
    },
    "fixAction": {
      "type": "config-change",
      "description": "Raise memory requests to 128Mi and limits to 256Mi"
    },
    "deployment": { "namespace": "kube-memory-test" }
  }
}
```

**Act 3 — Apply fix (you, via kubectl)**

```bash
kubectl delete pod payment-simulator -n kube-memory-test --ignore-not-found
kubectl apply -f docs/k8s-test/oom-payment-simulator-fixed.yaml
kubectl get pods -n kube-memory-test -w
```

**Act 4 — Close the loop**

```
Use kube-memory MCP only.

1. memory_remember — update outcome: incident resolved after raising memory limits to 256Mi.
2. memory_recall — "OOMKilled payment-simulator kube-memory-test"
3. predict_risk for serviceName "payment-simulator"
```

### Step 7 — Optional extra scenarios

```bash
# CrashLoopBackOff
kubectl apply -f docs/k8s-test/crashloop-notification.yaml
# MCP: k8s_get_events + k8s_pod_logs for notification-service

# Missing Secret (CreateContainerConfigError)
kubectl apply -f docs/k8s-test/config-error-api.yaml
# MCP: events will mention secret not found
```

### Step 8 — Cleanup

```bash
kubectl delete namespace kube-memory-test
kind delete cluster --name kube-memory-demo
```

---

## Track B — Prod server + cloud cluster

Use when the API server has a **public URL** reachable from Vercel.

### Step 1 — Create a small cluster

Any managed Kubernetes (GKE Autopilot trial, EKS, DigitalOcean, etc.). Install `kubectl` context locally.

### Step 2 — Deploy test workloads

```bash
kubectl apply -f docs/k8s-test/namespace.yaml
kubectl apply -f docs/k8s-test/reader-rbac.yaml
kubectl apply -f docs/k8s-test/oom-payment-simulator.yaml
```

### Step 3 — Build a read-only kubeconfig for kube-memory

```bash
# Token (valid 1 year — adjust for your policy)
TOKEN=$(kubectl create token kube-memory-reader -n kube-memory-test --duration=8760h)

# Cluster API URL + CA from your context
CLUSTER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

cat <<EOF
apiVersion: v1
kind: Config
clusters:
  - name: kube-memory-test
    cluster:
      server: ${CLUSTER}
      certificate-authority-data: ${CA}
contexts:
  - name: kube-memory-test
    context:
      cluster: kube-memory-test
      namespace: kube-memory-test
      user: kube-memory-reader
current-context: kube-memory-test
users:
  - name: kube-memory-reader
    token: ${TOKEN}
EOF
```

Copy that YAML into **prod dashboard** → Integrations → Kubernetes.

### Step 4 — Prod dashboard & MCP

1. [Local dashboard](http://localhost:5173/) → Integrations → Kubernetes → paste kubeconfig → Test → Save → **Enable**
2. Ensure `COGNEE_API_KEY` is set on prod server (for `memory_*` tools)
3. API Keys → `km_*` key
4. Cursor `mcp.json`:

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer km_YOUR_KEY"
      }
    }
  }
}
```

Run the **same MCP script** from Track A Step 6.

---

## Mock scenario reference

### Scenario 1 — OOMKilled (primary)

| Field | Value |
|-------|--------|
| Pod | `payment-simulator` |
| Namespace | `kube-memory-test` |
| Symptom | Pod exits, `OOMKilled` |
| Root cause | Memory limit 64Mi, stress allocates 200Mi |
| Fix | Apply `oom-payment-simulator-fixed.yaml` (256Mi limit) |
| Classifier | `Resource Limit` |

### Scenario 2 — CrashLoopBackOff

| Field | Value |
|-------|--------|
| Pod | `notification-service` |
| Symptom | Restarts every few seconds |
| Fix | Fix command / image (not auto-applied by kube-memory) |

### Scenario 3 — Configuration Error

| Field | Value |
|-------|--------|
| Pod | `api-gateway` |
| Symptom | `CreateContainerConfigError`, secret missing |
| Fix | `kubectl create secret generic api-gateway-secrets --from-literal=password=dev -n kube-memory-test` |

---

## 10-minute demo script (judges / recording)

| Min | Action | Tool |
|-----|--------|------|
| 0 | “Pod failing in kube-memory-test” | `k8s_get_events`, `k8s_pod_logs` |
| 2 | “Seen this before?” | `memory_recall` (empty first run is OK) |
| 4 | Diagnose OOM + suggest limit increase | Agent reasoning + events |
| 6 | Apply fix manifest | `kubectl` (human) |
| 7 | Remember outcome | `memory_remember` |
| 8 | Break again (re-apply OOM pod) | `kubectl apply -f oom-payment-simulator.yaml` |
| 9 | Recall + risk | `memory_recall`, `predict_risk` |

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| **`ECONNREFUSED 127.0.0.1:55xxx`** with a remote MCP URL | `mcp.json` points at a remote server but kubeconfig has `server: https://127.0.0.1:…` (kind). A remote server's `127.0.0.1` is **not** your Mac. | For kind: set MCP URL to `http://localhost:3000/mcp` and run `cd server && npm run dev`. **Or** use a cloud cluster for remote deployment. |
| `kube_memory_status` works but `k8s_*` fails | Status reads MongoDB only; K8s tools call the API in kubeconfig | Same as above — match MCP server location to cluster reachability |
| Test connection fails | Bad kubeconfig YAML | Re-copy; ensure `current-context` is set |
| MCP says connector not configured | Saved but not **enabled** | Toggle Enabled on Integrations card |
| MCP 401 | Wrong or revoked `km_*` key | Create new key; update `mcp.json` |
| Prod can’t reach cluster | localhost / private API | Use Track B cloud cluster or Track A local server |
| `k8s_pod_logs` empty | Pod already terminated | Use `k8s_get_events`; OOM pods often have little log |
| `memory_recall` empty | No episodes yet | Run Act 2 `memory_remember` first |
| `memory_*` errors | `COGNEE_API_KEY` missing on server | Set on prod env and redeploy |

### Verify connector from CLI (local server)

```bash
curl -s http://localhost:3000/status \
  -H "Authorization: Bearer km_YOUR_KEY" | jq .
```

Look for `connectors.kubernetes.mcpActive: true`.

---

## Checklist

- [ ] Cluster running; `payment-simulator` is OOMKilled or Error
- [ ] Kubernetes integration: configured + **enabled** in dashboard
- [ ] `km_*` key in Cursor MCP config pointing at correct server URL
- [ ] `kube_memory_status` shows kubernetes active
- [ ] `k8s_get_events` returns OOM-related events
- [ ] `k8s_pod_logs` returns output (or explain empty for OOM)
- [ ] `memory_remember` + `memory_recall` round-trip works
- [ ] Fixed pod runs after applying `oom-payment-simulator-fixed.yaml`

---

## Related docs

- [setup.md](./setup.md) — local dev env
- [demo-environment.md](./demo-environment.md) — full multi-connector demo topology
- [mcp-tools.md](./mcp-tools.md) — MCP tool reference
