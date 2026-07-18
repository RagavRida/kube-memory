# Local development setup

Use this guide to run kube-memory on your machine. Open the local dashboard at [http://localhost:5173/](http://localhost:5173/).

## Prerequisites

- Node.js 22+
- MongoDB Atlas (or local MongoDB) for workspace metadata and auth
- [Cognee Cloud](https://www.cognee.ai/) API key for semantic memory tools

## 1. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`. Required variables are documented in [server/API_DOC.md](../server/API_DOC.md). At minimum for a working dashboard and MCP:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Workspace, user, and API key storage |
| `JWT_SECRET` | Dashboard session tokens |
| `API_KEY_SALT` | Hashing for `km_*` API keys |
| `CONNECTOR_ENCRYPTION_KEY` | Encrypt integration secrets (32+ chars) |
| `COGNEE_API_KEY` | Semantic memory (`memory_*`, `predict_risk`) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Optional GitHub OAuth login |
| `GITHUB_CALLBACK_URL` | `http://localhost:3000/auth/github/callback` |
| `CLIENT_URL` | `http://localhost:5173` |
| `CORS_ORIGIN` | `http://localhost:5173` |

## 2. Start the API server

```bash
cd server
npm install
npm run dev
```

The server listens on **http://localhost:3000**. Open that URL for the API index, or hit `/health` for a liveness probe.

## 3. Start the dashboard

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The dashboard runs at **http://localhost:5173**. Vite proxies `/api` to `http://localhost:3000` in dev, so you do not need `VITE_API_URL` locally.

## 4. Connect your IDE (local)

After creating an API key in the dashboard:

```json
{
  "mcpServers": {
    "kube-memory": {
      "url": "http://localhost:3000/mcp",
      "headers": {
        "Authorization": "Bearer km_your_api_key_here"
      }
    }
  }
}
```

Restart your editor. See [mcp-tools.md](./mcp-tools.md) and the dashboard **Documentation** page (`/docs`) for the full tool catalog and workflows.

## Optional client overrides

Copy `client/.env.example` to `client/.env` only when the API is not on `localhost:3000` (e.g. pointing a local UI at a remote API):

```bash
VITE_API_URL=http://localhost:3000
```

## Verify

```bash
cd server && npm run build
cd client && npm run build
```

Both should complete without errors.
