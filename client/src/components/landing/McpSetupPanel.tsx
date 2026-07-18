import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/dashboard/CopyButton";
import { getMcpEndpointUrl } from "@/lib/api";

const clients = [
  { id: "cursor", label: "Cursor", hint: "Settings → MCP → Add server" },
  { id: "vscode", label: "VS Code", hint: "mcp.json in your workspace or user config" },
  { id: "claude", label: "Claude Desktop", hint: "claude_desktop_config.json" },
] as const;

function snippet() {
  const endpoint = getMcpEndpointUrl();
  return JSON.stringify(
    {
      mcpServers: {
        "kube-memory": {
          url: endpoint,
          headers: {
            Authorization: "Bearer km_your_api_key_here",
          },
        },
      },
    },
    null,
    2,
  );
}

export function McpSetupPanel() {
  const config = useMemo(() => snippet(), []);

  return (
    <section className="landing-mcp-band">
      <div className="landing-section">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 min-w-0">
            <h2 className="font-heading text-2xl font-medium tracking-tight">Paste into your IDE</h2>
            <p className="text-muted-foreground">
              Streamable HTTP MCP config for Cursor, VS Code, and Claude Desktop.
            </p>
          </div>
          <CopyButton
            value={config}
            label="Copy config"
            toastMessage="MCP config copied"
          />
        </div>
        <Tabs defaultValue="cursor">
          <TabsList className="mb-4">
            {clients.map((client) => (
              <TabsTrigger key={client.id} value={client.id}>
                {client.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {clients.map((client) => (
            <TabsContent key={client.id} value={client.id}>
              <p className="mb-3 text-xs text-muted-foreground">{client.hint}</p>
              <pre className="code-block max-h-80 overflow-auto whitespace-pre">{config}</pre>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
