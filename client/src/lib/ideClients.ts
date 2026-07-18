import { getMcpEndpointUrl } from "@/lib/api";
import antigravitylogo from "@/assets/images/antigravity.png";
import claudecodelogo from "@/assets/images/claudecode.png";
import codexlogo from "@/assets/images/codex.png";
import cursorlogo from "@/assets/images/cursor.png";
import vscodelogo from "@/assets/images/vscode.png";
import claudelogo from "@/assets/images/claude.png";

export const IDE_CLIENT_IDS = ["antigravity", "cursor", "vscode", "claude", "claude-code", "codex"] as const;
export type IdeClientId = (typeof IDE_CLIENT_IDS)[number];

export type IdeClient = {
  id: IdeClientId;
  label: string;
  logo: string;
  configPath: string;
  format: "json" | "toml";
  steps: string[];
  hint: string;
};

export const ideClients: IdeClient[] = [
  {
    id: "antigravity",
    label: "Antigravity",
    logo: antigravitylogo,
    configPath: "~/.gemini/config/mcp_config.json (or .agents/mcp_config.json in workspace)",
    format: "json",
    hint: "Agent panel → … → MCP Servers → Manage MCP Servers → View raw config. Uses serverUrl for remote HTTP servers.",
    steps: [
      "Open Manage MCP Servers → View raw config",
      "Add the kube-memory entry under mcpServers",
      "Save and refresh MCP servers in Customizations",
      "Ask the agent to call kube_memory_status to verify tools load",
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    logo: cursorlogo,
    configPath: ".cursor/mcp.json (project) or ~/.cursor/mcp.json (global)",
    format: "json",
    hint: "Cmd+Shift+P → View: Open MCP Settings, or edit mcp.json directly. Restart Cursor after saving.",
    steps: [
      "Open MCP Settings or create mcp.json",
      "Paste the config below",
      "Restart Cursor",
      "Verify kube_memory_status in the MCP tools panel",
    ],
  },
  {
    id: "vscode",
    label: "VS Code",
    logo: vscodelogo,
    configPath: ".vscode/mcp.json (workspace) or user-level MCP config",
    format: "json",
    hint: "Requires GitHub Copilot with MCP support. Reload the window after editing mcp.json.",
    steps: [
      "Create or open .vscode/mcp.json",
      "Paste the config below",
      "Reload window (Cmd+Shift+P → Developer: Reload Window)",
      "Open Copilot MCP panel and confirm kube-memory tools appear",
    ],
  },
  {
    id: "claude",
    label: "Claude Desktop",
    logo: claudelogo,
    configPath: "~/Library/Application Support/Claude/claude_desktop_config.json (macOS)",
    format: "json",
    hint: "Windows: %APPDATA%\\Claude\\claude_desktop_config.json. Fully quit and reopen Claude after saving.",
    steps: [
      "Open claude_desktop_config.json",
      "Add kube-memory under mcpServers",
      "Restart Claude Desktop",
      "Check that MCP tools are listed in a new chat",
    ],
  },
  {
    id: "claude-code",
    label: "Claude Code",
    logo: claudecodelogo,
    configPath: ".mcp.json (project root, shared via git) or ~/.claude.json (user scope)",
    format: "json",
    hint: "Use --scope project with claude mcp add, or edit .mcp.json directly. Supports ${VAR} for API keys.",
    steps: [
      "Create .mcp.json in your project root",
      "Paste the config below (use ${KUBE_MEMORY_API_KEY} for secrets)",
      "Start a new Claude Code session in the project",
      "Run claude mcp list or ask the agent to call kube_memory_status",
    ],
  },
  {
    id: "codex",
    label: "Codex",
    logo: codexlogo,
    configPath: "~/.codex/config.toml (or .codex/config.toml in trusted projects)",
    format: "toml",
    hint: "MCP settings → Open config.toml, or run codex mcp add. Use bearer_token_env_var — not the raw token.",
    steps: [
      "Open ~/.codex/config.toml",
      "Add the [mcp_servers.kube-memory] block below",
      "export KUBE_MEMORY_API_KEY=km_your_key in your shell",
      "Launch Codex and confirm tools load via codex mcp list",
    ],
  },
];

function mcpJsonSnippet(opts?: { serverUrl?: boolean; claudeCode?: boolean; apiKey?: string }) {
  const endpoint = getMcpEndpointUrl();
  const auth = opts?.claudeCode
    ? opts.apiKey
      ? `Bearer ${opts.apiKey}`
      : "Bearer ${KUBE_MEMORY_API_KEY:-km_your_api_key_here}"
    : `Bearer ${opts?.apiKey ?? "km_your_api_key_here"}`;

  const server = opts?.serverUrl
    ? { serverUrl: endpoint, headers: { Authorization: auth } }
    : opts?.claudeCode
      ? { type: "http", url: endpoint, headers: { Authorization: auth } }
      : { url: endpoint, headers: { Authorization: auth } };

  return JSON.stringify({ mcpServers: { "kube-memory": server } }, null, 2);
}

function codexTomlSnippet() {
  const endpoint = getMcpEndpointUrl();
  return `[mcp_servers.kube-memory]
url = "${endpoint}"
bearer_token_env_var = "KUBE_MEMORY_API_KEY"
enabled = true`;
}

export function ideClientSnippet(id: IdeClientId, apiKey?: string) {
  if (id === "antigravity") return mcpJsonSnippet({ serverUrl: true, apiKey });
  if (id === "claude-code") return mcpJsonSnippet({ claudeCode: true, apiKey });
  if (id === "codex") return codexTomlSnippet();
  return mcpJsonSnippet({ apiKey });
}
