const steps = [
  { title: "Sign up", body: "Create a workspace with email or GitHub." },
  { title: "Connect K8s", body: "Paste kubeconfig in the dashboard connectors page." },
  { title: "Create API key", body: "Generate a km_* key with reader or admin role." },
  { title: "Paste into IDE", body: "Add the MCP config and start triaging with memory." },
];

export function DeveloperJourneySection() {
  return (
    <section className="landing-section border-t border-border">
      <div className="mb-8 space-y-2">
        <h2 className="font-heading text-2xl font-medium tracking-tight">Developer journey</h2>
        <p className="text-muted-foreground">From zero to memory-augmented incident triage in minutes.</p>
      </div>
      <div className="landing-journey-steps">
        {steps.map((step, index) => (
          <div key={step.title} className="landing-journey-step">
            <p className="font-heading text-xs text-[var(--color-accent-signal)]">
              Step {index + 1}
            </p>
            <h3 className="mt-2 font-medium">{step.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
