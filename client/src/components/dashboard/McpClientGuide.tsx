import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { getMcpEndpointUrl } from "@/lib/api";
import { ideClients, ideClientSnippet, type IdeClientId } from "@/lib/ideClients";

interface McpClientGuideProps {
  apiKey?: string;
  compact?: boolean;
}

export function McpClientGuide({ apiKey, compact }: McpClientGuideProps) {
  const [activeIdeClient, setActiveIdeClient] = useState<IdeClientId>("cursor");

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
        <div>
          <h2 className="font-heading text-lg font-medium">Connect your IDE</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste this MCP config into your client.
            {apiKey
              ? " Your new API key is already in the config below."
              : " Replace the Bearer token if you have not copied your key yet, or set KUBE_MEMORY_API_KEY in your environment."}
          </p>
        </div>
      )}

      <div className="rounded-xl border bg-muted/10 p-4 space-y-3 sm:p-5">
        <h3 className="font-heading text-sm font-medium">Supported clients</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ideClients.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setActiveIdeClient(client.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40 ${
                activeIdeClient === client.id
                  ? "border-[var(--color-accent-signal)] bg-muted/30"
                  : "bg-muted/10"
              }`}
            >
              <img src={client.logo} alt={client.label} className="h-8 w-auto object-contain" />
              <span className="text-xs font-medium">{client.label}</span>
            </button>
          ))}
        </div>
      </div>

      <Accordion type="single" collapsible value={activeIdeClient} onValueChange={(v) => v && setActiveIdeClient(v as IdeClientId)}>
        {ideClients.map((client) => {
          const config = ideClientSnippet(client.id, apiKey);
          return (
            <AccordionItem key={client.id} value={client.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <img src={client.logo} alt={client.label} className="h-7 w-auto object-contain" />
                  <div>
                    <p className="font-heading font-medium">{client.label}</p>
                    <p className="text-xs font-normal text-muted-foreground">{client.configPath}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-5">
                <p className="text-sm text-muted-foreground">{client.hint}</p>
                <ol className="grid gap-2 sm:grid-cols-2">
                  {client.steps.map((step, i) => (
                    <li
                      key={step}
                      className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[10px] font-medium text-foreground">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {client.format === "toml" ? "config.toml" : "mcp.json"}
                  </p>
                  <CopyButton value={config} label="Copy config" toastMessage="MCP config copied" />
                </div>
                <pre className="code-block max-h-72 overflow-auto whitespace-pre">{config}</pre>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {!compact && (
        <p className="text-xs text-muted-foreground">
          Endpoint: <code className="font-mono">{getMcpEndpointUrl()}</code>
        </p>
      )}
    </div>
  );
}
