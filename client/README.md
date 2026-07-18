# kube-memory client

Web dashboard and landing page for kube-memory.

See the [root README](../README.md) for product overview. MCP tool reference: [docs/mcp-tools.md](../docs/mcp-tools.md).

## Run locally

```bash
npm install
npm run dev
```

Runs at **http://localhost:5173** with the API proxied to `http://localhost:3000` in development.

## Documentation in the app

Open **http://localhost:5173/docs** (or `/docs` on the hosted dashboard) for:

- **Getting started** — workspace setup journey
- **Integrations** — per-connector setup steps
- **MCP tools** — full tool catalog with parameters
- **Workflows** — `kube_deploy`, `incident_open`, manual detect loop
- **IDE setup** — Cursor, VS Code, Claude Desktop MCP config
- **REST API** — automation endpoints

## Cursor slash commands

The `/kube-deploy` command is **not** part of the MCP server. It lives in the repo at [`.cursor/commands/kube-deploy.md`](../.cursor/commands/kube-deploy.md) and tells Cursor Agent how to call the `kube_deploy` MCP tool. Keep it in the repo for demo ergonomics; you can also invoke `kube_deploy` directly from chat.
