import { StatusBadge } from "@/components/dashboard/StatusBadge";
import {
  GitHubShowcase,
  K8sShowcase,
  MemoryRecallShowcase,
  McpShowcase,
  RiskShowcase,
} from "@/components/landing/FeatureShowcases";

const bentoItems = [
  {
    id: "memory",
    title: "Semantic memory",
    description: "Store incidents, fixes, and deploy outcomes. Recall similar failures before you ship again.",
    badge: "Shipped",
    status: "active" as const,
    span: "lg:col-span-2 lg:row-span-2",
    accent: true,
    dense: true,
    showcase: "memory" as const,
  },
  {
    id: "k8s",
    title: "Kubernetes tools",
    description: "Read pod logs and cluster events from your connected cluster.",
    badge: "Shipped",
    status: "active" as const,
    span: "lg:col-span-1",
    dense: false,
    showcase: "k8s" as const,
  },
  {
    id: "risk",
    title: "Deploy risk scoring",
    description: "Score planned deploys against past failures in workspace memory.",
    badge: "Shipped",
    status: "active" as const,
    span: "lg:col-span-1",
    dense: false,
    showcase: "risk" as const,
  },
  {
    id: "mcp",
    title: "MCP-native",
    description: "One HTTP endpoint for Cursor, VS Code, Claude Desktop, and CI.",
    badge: "Core",
    status: "active" as const,
    span: "lg:col-span-2",
    dense: true,
    showcase: "mcp" as const,
  },
  {
    id: "github",
    title: "GitHub",
    description: "Link commits and PRs to incident episodes for richer recall.",
    badge: "Dashboard",
    status: "inactive" as const,
    span: "lg:col-span-1",
    dense: false,
    showcase: "github" as const,
  },
];

function Showcase({ type }: { type: (typeof bentoItems)[number]["showcase"] }) {
  switch (type) {
    case "memory":
      return <MemoryRecallShowcase />;
    case "k8s":
      return <K8sShowcase />;
    case "risk":
      return <RiskShowcase />;
    case "mcp":
      return <McpShowcase />;
    case "github":
      return <GitHubShowcase />;
  }
}

export function BentoFeatureGrid() {
  return (
    <section className="landing-section" id="features">
      <div className="mb-10 space-y-3">
        <h2 className="font-display text-3xl font-normal tracking-tight md:text-4xl">
          Built for agents that outlive a single session
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          kube-memory is the memory layer between your infrastructure and every AI client that touches it.
        </p>
      </div>

      <div className="bento-grid">
        {bentoItems.map((item) => (
          <article
            key={item.id}
            className={`bento-tile ${item.span} ${item.accent ? "bento-tile-accent" : ""} ${item.dense ? "bento-tile-dense" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-normal tracking-tight">{item.title}</h3>
              <StatusBadge status={item.status} label={item.badge} className="shrink-0" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            <Showcase type={item.showcase} />
          </article>
        ))}
      </div>
    </section>
  );
}
