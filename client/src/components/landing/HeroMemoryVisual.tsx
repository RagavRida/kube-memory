import { useEffect, useState, type CSSProperties } from "react";

const PHASE_MS = 3200;

const phases = [
  {
    id: "alert",
    label: "Symptom detected",
    agent: "CrashLoopBackOff · payment-api",
    memory: null as string | null,
    k8s: null as string | null,
  },
  {
    id: "recall",
    label: "memory_recall",
    agent: "Querying workspace memory…",
    memory: "3 OOM incidents · payment-api",
    k8s: null,
  },
  {
    id: "context",
    label: "Context found",
    agent: "Applying known fix",
    memory: "Fix: raise limit to 512Mi",
    k8s: "k8s_get_events · Warning",
  },
  {
    id: "resolved",
    label: "Outcome stored",
    agent: "Incident resolved",
    memory: "memory_remember · success",
    k8s: "Pod running · 2/2 ready",
  },
];

export function HeroMemoryVisual() {
  const [index, setIndex] = useState(0);
  const phase = phases[index];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % phases.length);
    }, PHASE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hero-visual" aria-hidden="true">
      <div className="hero-visual-glow" />

      <div className="hero-visual-header">
        <span className="hero-visual-dot" />
        <span className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground">
          Live agent loop
        </span>
        <span className="hero-visual-phase">{phase.label}</span>
      </div>

      <div className="hero-visual-flow">
        <div className="hero-visual-node">
          <span className="hero-visual-node-label">IDE agent</span>
          <p className="hero-visual-node-value">{phase.agent}</p>
        </div>

        <div className="hero-visual-connector" data-active={index > 0} />

        <div className="hero-visual-hub">
          <span className="font-heading text-xs font-medium">kube-memory</span>
          <span className="text-[10px] text-[var(--color-accent-signal)]">MCP</span>
        </div>

        <div className="hero-visual-connector" data-active={index > 1} />

        <div className="hero-visual-stack">
          <div className={`hero-visual-card ${phase.memory ? "is-visible" : ""}`}>
            <span className="text-[10px] text-[var(--color-accent-signal)]">Memory</span>
            <p className="mt-1 font-heading text-xs">{phase.memory ?? "—"}</p>
          </div>
          <div className={`hero-visual-card ${phase.k8s ? "is-visible" : ""}`}>
            <span className="text-[10px] text-[var(--color-accent-signal)]">Cluster</span>
            <p className="mt-1 font-heading text-xs">{phase.k8s ?? "—"}</p>
          </div>
        </div>
      </div>

      <div className="hero-visual-metrics">
        <div>
          <p className="text-[10px] text-muted-foreground">Match confidence</p>
          <p className="font-heading text-lg tabular-nums">
            {index >= 2 ? "0.91" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Time to context</p>
          <p className="font-heading text-lg tabular-nums">
            {index >= 2 ? "4.2s" : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Tools invoked</p>
          <p className="font-heading text-lg tabular-nums">{Math.min(index + 1, 3)}</p>
        </div>
      </div>

      <div
        className="hero-visual-progress"
        style={{ "--hero-phase-ms": `${PHASE_MS}ms` } as CSSProperties}
      >
        {phases.map((p, i) => (
          <span key={p.id} className={i === index ? "is-active" : i < index ? "is-done" : ""} />
        ))}
      </div>
    </div>
  );
}
