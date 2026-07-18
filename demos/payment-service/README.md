# payment-service demo

Small HTTP services for the kube-deploy OOM demo loop.

## Services

| Service | Port | Role |
|---------|------|------|
| `payment-service` | 8080 | Core payment API — canary leaks memory when `MEMORY_LEAK=true` |
| `order-api` | 8081 | Dependent service — returns 500 when payment-service is down |

## Quick start (local kind)

```bash
chmod +x scripts/demo-setup.sh
./scripts/demo-setup.sh
```

Then in Cursor:

```
/kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml
```

## Manifests

| File | Purpose |
|------|---------|
| `k8s/payment-service-stable.yaml` | Stable deployment (prod traffic) |
| `k8s/payment-service-canary.yaml` | Broken canary (OOM after ~20s) |
| `k8s/payment-service-canary-fixed.yaml` | Fix applied by kube-memory |
| `k8s/payment-service-svc.yaml` | Routes to `version: stable` |
| `k8s/order-api.yaml` | Dependent service + Service |
| `k8s/prometheus-rules.yaml` | Optional alert rules |

## Environment

Configure in `server/.env`:

```bash
PAYMENT_SERVICE_GITHUB_OWNER=your-org
PAYMENT_SERVICE_GITHUB_REPO=payment-service
```

GitHub connector PAT needs `repo` write scope for automated fix PRs.
