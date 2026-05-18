import { APP_NAME, MCP_PATH, sendJson } from "../src/townino-app.js";

export default function handler(_req, res) {
  sendJson(res, 200, {
    ok: true,
    app: APP_NAME,
    mcp: MCP_PATH,
    preview: "/preview",
    runtime: "vercel",
  });
}
