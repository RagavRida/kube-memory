import type { CSSProperties } from "react";

export function MemoryRecallShowcase() {
  const matches = [
    { label: "OOMKilled · payment-api · prod", score: 91, age: "12d ago", fix: "512Mi limit" },
    { label: "Exit 137 · checkout-worker", score: 87, age: "28d ago", fix: "HPA max 8→12" },
    { label: "Memory limit patch · v2.4.1", score: 84, age: "31d ago", fix: "merged PR #882" },
    { label: "Deploy rollback · canary fail", score: 72, age: "45d ago", fix: "revert chart" },
    { label: "Node pressure · spot eviction", score: 58, age: "52d ago", fix: "on-demand pool" },
  ];

  const episodes = [
    { id: "ep-1842", type: "incident", service: "payment-api", outcome: "resolved" },
    { id: "ep-1839", type: "deploy", service: "payment-api", outcome: "failed" },
    { id: "ep-1831", type: "fix", service: "checkout-worker", outcome: "stored" },
  ];

  return (
    <div className="showcase-memory mt-4 flex min-h-0 flex-1 flex-col gap-3">
      <div className="showcase-memory-grid">
        <div className="showcase-panel showcase-panel-dense">
          <div className="flex items-center justify-between gap-2">
            <p className="showcase-label">memory_recall</p>
            <span className="font-mono text-[10px] text-[var(--color-accent-signal)]">topK=5</span>
          </div>
          <p className="mt-1 font-heading text-xs text-foreground">
            &quot;payment-api OOMKilled · last 30 days&quot;
          </p>
          <ul className="mt-3 space-y-2.5">
            {matches.map((m) => (
              <li key={m.label} className="showcase-memory-match">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 text-[11px] leading-snug">{m.label}</span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--color-accent-signal)]">
                    {m.score}%
                  </span>
                </div>
                <div className="showcase-bar showcase-bar-wide mt-1.5">
                  <span style={{ width: `${m.score}%` }} />
                </div>
                <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{m.fix}</span>
                  <span>{m.age}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="showcase-panel showcase-panel-dense">
            <p className="showcase-label">Workspace graph</p>
            <div className="showcase-stat-grid mt-2">
              <div>
                <p className="text-lg font-heading tabular-nums">847</p>
                <p className="text-[10px] text-muted-foreground">episodes</p>
              </div>
              <div>
                <p className="text-lg font-heading tabular-nums">2.1k</p>
                <p className="text-[10px] text-muted-foreground">edges</p>
              </div>
              <div>
                <p className="text-lg font-heading tabular-nums">14</p>
                <p className="text-[10px] text-muted-foreground">services</p>
              </div>
            </div>
            <div className="showcase-graph mt-3">
              <span className="showcase-graph-node center">payment-api</span>
              <span className="showcase-graph-node top">OOMKilled</span>
              <span className="showcase-graph-node left">512Mi fix</span>
              <span className="showcase-graph-node right">deploy v2.4</span>
              <span className="showcase-graph-node bottom">prod/ns</span>
            </div>
          </div>

          <div className="showcase-panel showcase-panel-dense flex-1">
            <p className="showcase-label">Recent episodes</p>
            <ul className="mt-2 space-y-1.5">
              {episodes.map((ep) => (
                <li key={ep.id} className="showcase-episode-row">
                  <code className="text-[10px] text-muted-foreground">{ep.id}</code>
                  <span className="text-[11px]">{ep.service}</span>
                  <span className="showcase-episode-tag">{ep.type}</span>
                  <span className={`showcase-episode-outcome outcome-${ep.outcome}`}>{ep.outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="showcase-tool-row">
        {["memory_remember", "memory_recall", "memory_forget", "predict_risk"].map((tool) => (
          <code key={tool} className="showcase-tool-pill">
            {tool}
          </code>
        ))}
      </div>
    </div>
  );
}

export function K8sShowcase() {
  const pods = [
    { name: "payment-api-7f8c", status: "OOMKilled", tone: "danger" },
    { name: "payment-api-6d2a", status: "Running", tone: "ok" },
    { name: "redis-0", status: "Running", tone: "ok" },
  ];

  return (
    <div className="showcase-panel mt-4">
      <p className="showcase-label">production · pods</p>
      <ul className="mt-2 space-y-1.5">
        {pods.map((pod) => (
          <li key={pod.name} className="showcase-k8s-row">
            <span className={`showcase-status-dot tone-${pod.tone}`} />
            <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{pod.name}</span>
            <span className={`text-[10px] ${pod.tone === "danger" ? "text-destructive" : "text-muted-foreground"}`}>
              {pod.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RiskShowcase() {
  const score = 73;
  return (
    <div className="showcase-panel mt-4 flex items-center gap-4">
      <div className="showcase-ring" style={{ "--score": score } as CSSProperties}>
        <span className="font-heading text-lg tabular-nums">{score}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium">payment-api deploy</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          3 similar OOM failures in memory. Review limits before ship.
        </p>
      </div>
    </div>
  );
}

export function McpShowcase() {
  const clients = [
    { name: "Cursor", tools: 6, status: "connected" },
    { name: "VS Code", tools: 6, status: "connected" },
    { name: "Claude", tools: 6, status: "idle" },
    { name: "CI pipeline", tools: 4, status: "connected" },
  ];

  const tools = [
    "memory_recall",
    "memory_remember",
    "k8s_pod_logs",
    "k8s_get_events",
    "predict_risk",
    "memory_forget",
  ];

  return (
    <div className="showcase-mcp-full mt-4">
      <div className="showcase-mcp-layout">
        <div className="showcase-mcp-clients-col">
          <p className="showcase-label mb-2">MCP clients</p>
          {clients.map((c) => (
            <div key={c.name} className="showcase-mcp-client-row">
              <span className={`showcase-status-dot tone-${c.status === "connected" ? "ok" : "idle"}`} />
              <span className="min-w-0 flex-1 text-xs font-medium">{c.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{c.tools} tools</span>
            </div>
          ))}
        </div>

        <div className="showcase-mcp-pipe">
          <div className="showcase-mcp-line" />
          <div className="showcase-mcp-hub-large">
            <span className="font-heading text-xs font-medium">kube-memory</span>
            <span className="font-mono text-[10px] text-[var(--color-accent-signal)]">POST /mcp</span>
            <span className="text-[9px] text-muted-foreground">streamable HTTP · JSON-RPC</span>
          </div>
          <div className="showcase-mcp-line" />
        </div>

        <div className="showcase-mcp-tools-col">
          <p className="showcase-label mb-2">Exposed tools</p>
          <div className="showcase-mcp-tools-grid">
            {tools.map((tool) => (
              <code key={tool} className="showcase-mcp-tool-chip">
                {tool}
              </code>
            ))}
          </div>
        </div>
      </div>

      <div className="showcase-mcp-footer">
        <div className="showcase-mcp-auth">
          <span className="showcase-label">Authorization</span>
          <code className="mt-1 block font-mono text-[10px]">Bearer km_••••••••••••</code>
        </div>
        <div className="showcase-mcp-metrics">
          <div>
            <p className="text-[10px] text-muted-foreground">Requests / hr</p>
            <p className="font-heading text-sm tabular-nums">128</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Avg latency</p>
            <p className="font-heading text-sm tabular-nums">142ms</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Active keys</p>
            <p className="font-heading text-sm tabular-nums">3</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GitHubShowcase() {
  return (
    <div className="showcase-panel mt-4 space-y-2">
      <div className="showcase-commit">
        <span className="font-mono text-[10px] text-[var(--color-accent-signal)]">abc12fe</span>
        <span className="text-xs">fix: raise payment-api memory limit</span>
      </div>
      <div className="showcase-commit opacity-80">
        <span className="font-mono text-[10px] text-muted-foreground">9d4e881</span>
        <span className="text-xs">incident: OOMKilled rollout</span>
      </div>
      <div className="showcase-commit opacity-60">
        <span className="font-mono text-[10px] text-muted-foreground">c4f29a3</span>
        <span className="text-xs">chore: link PR #882 to memory episode</span>
      </div>
    </div>
  );
}
