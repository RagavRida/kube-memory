import { StatusBadge } from "@/components/dashboard/StatusBadge";

const features = [
  {
    title: "Memory tools",
    status: "active" as const,
    badge: "Shipped",
    description: "remember, recall, forget — backed by Cognee Cloud semantic search.",
  },
  {
    title: "Kubernetes read tools",
    status: "active" as const,
    badge: "Shipped",
    description: "Pod logs and cluster events scoped to your connected kubeconfig.",
  },
  {
    title: "Risk prediction",
    status: "active" as const,
    badge: "Shipped",
    description: "predict_risk surfaces deploy risk from historical incident patterns.",
  },
  {
    title: "GitHub connector",
    status: "active" as const,
    badge: "Shipped",
    description: "List issues, PRs, and commits for incident context via MCP.",
  },
  {
    title: "Slack + PagerDuty",
    status: "active" as const,
    badge: "Shipped",
    description: "Read Slack history and list PagerDuty incidents for alert enrichment.",
  },
  {
    title: "Prometheus + ArgoCD",
    status: "active" as const,
    badge: "Shipped",
    description: "PromQL queries, alert inspection, GitOps sync, and rollback via MCP.",
  },
];

export function FeatureGrid() {
  return (
    <section className="landing-section">
      <div className="mb-8 space-y-2">
        <h2 className="font-heading text-2xl font-medium tracking-tight">MCP tools and connectors</h2>
        <p className="text-muted-foreground">One server for your IDE, CI, and on-call workflows.</p>
      </div>
      <div className="landing-feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="landing-feature-card">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-base font-medium">{feature.title}</h3>
              <StatusBadge
                status={feature.status}
                label={feature.badge}
                className="shrink-0"
              />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
