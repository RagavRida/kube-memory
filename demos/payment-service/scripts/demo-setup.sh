#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER_NAME="${CLUSTER_NAME:-kube-memory-demo}"

echo "==> Building Docker images..."
docker build -t payment-service:stable "$ROOT"
docker build -t payment-service:canary "$ROOT"
docker build -t order-api:latest "$ROOT/order-api"

if command -v kind >/dev/null 2>&1; then
  if ! kind get clusters 2>/dev/null | grep -qx "$CLUSTER_NAME"; then
    echo "==> Creating kind cluster $CLUSTER_NAME..."
    kind create cluster --name "$CLUSTER_NAME"
  fi
  echo "==> Loading images into kind..."
  kind load docker-image payment-service:stable payment-service:canary order-api:latest --name "$CLUSTER_NAME"
fi

echo "==> Applying stable stack..."
kubectl apply -f "$ROOT/k8s/namespace.yaml"
kubectl apply -f "$ROOT/k8s/payment-service-stable.yaml"
kubectl apply -f "$ROOT/k8s/payment-service-svc.yaml"
kubectl apply -f "$ROOT/k8s/order-api.yaml"

echo ""
echo "Demo ready. Stable payment-service is running in payment-demo namespace."
echo ""
echo "Next: run in Cursor:"
echo "  /kube-deploy @demos/payment-service/k8s/payment-service-canary.yaml"
echo ""
echo "Optional env (server/.env):"
echo "  PAYMENT_SERVICE_GITHUB_OWNER=your-org"
echo "  PAYMENT_SERVICE_GITHUB_REPO=payment-service"
