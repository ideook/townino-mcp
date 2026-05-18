# Townino MCP

Mock-data ChatGPT App that recommends neighborhood places and renders them in an interactive widget.

## Shape

- Archetype: `vanilla-widget`
- MCP endpoint: `http://localhost:8787/mcp`
- Local visual preview: `http://localhost:8787/preview`
- Data tool: `search_places`
- Render tool: `render_places`

The app uses mock data only. No API key, database, auth, or external service is required.

## Run

```bash
npm install
npm run check
npm run smoke
npm start
```

Open `http://localhost:8787/preview` to inspect the widget outside ChatGPT.

## Deploy To Vercel

This repo includes Vercel Functions routes and rewrites:

- `/mcp` -> `api/mcp.js`
- `/health` -> `api/health.js`
- `/preview` -> `api/preview.js`

For local Vercel-style testing:

```bash
npm run vercel:dev
```

Then, in a second terminal:

```bash
$env:SMOKE_BASE_URL = "http://127.0.0.1:8790"
npm run smoke
$env:VISUAL_URL = "http://127.0.0.1:8790/preview"
npm run visual
```

For a Vercel preview deployment:

```bash
vercel deploy
```

After deployment, use the deployment URL with `/mcp` in ChatGPT, for example:

```text
https://your-deployment-url.vercel.app/mcp
```

Keep authentication set to `No authentication` for this mock app. For production MCP usage on Vercel, enable Fluid compute in the Vercel project settings so `/mcp` has stable long-running HTTP behavior.

## Connect From ChatGPT

ChatGPT needs a public HTTPS URL for the MCP server.

```bash
npm start
ngrok http 8787
```

In ChatGPT:

1. Enable Developer Mode under Settings > Apps & Connectors > Advanced settings.
2. Create a new app/connector.
3. Paste the tunnel URL with `/mcp`, for example `https://example.ngrok.app/mcp`.
4. Refresh the app after server metadata or tool changes.

If deployed to Vercel, use the Vercel HTTPS URL instead of an ngrok URL.

## Useful Prompts

- "Find quiet coffee places within 15 minutes and show them."
- "Show me open local picks for a casual lunch."
- "Render the top Townino picks as cards."

## Validation

`npm run smoke` starts a local server, initializes MCP over HTTP, lists tools, calls `search_places`, and calls `render_places`.
