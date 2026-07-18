import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const steps = [
  {
    id: "symptom",
    label: "Symptom",
    title: "Detect the signal",
    body: "Agents pull pod logs, events, and alerts to capture what broke.",
  },
  {
    id: "diagnosis",
    label: "Diagnosis",
    title: "Find the root cause",
    body: "Cross-reference cluster state with prior incidents in memory.",
  },
  {
    id: "treatment",
    label: "Treatment",
    title: "Apply the fix",
    body: "Patch limits, roll back deploys, or scale — with context attached.",
  },
  {
    id: "outcome",
    label: "Outcome",
    title: "Remember the result",
    body: "Successful fixes are stored for the next agent and the next on-call.",
  },
];

export function MemoryLoopStrip() {
  return (
    <section className="landing-section border-t border-border">
      <div className="mb-8 space-y-2">
        <h2 className="font-heading text-2xl font-medium tracking-tight">The memory loop</h2>
        <p className="max-w-2xl text-muted-foreground">
          Stateless LLMs repeat the same triage. kube-memory turns every incident into durable
          context your IDE agent can recall.
        </p>
      </div>
      <Tabs defaultValue="symptom">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:grid-cols-4">
          {steps.map((step) => (
            <TabsTrigger key={step.id} value={step.id}>
              {step.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {steps.map((step) => (
          <TabsContent key={step.id} value={step.id} className="landing-loop-panel">
            <h3 className="font-heading font-medium">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
