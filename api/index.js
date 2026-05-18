import { APP_NAME, MCP_PATH } from "../src/townino-app.js";

export default function handler(_req, res) {
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end(
    [
      "Townino Local Picks MCP server",
      `App: ${APP_NAME}`,
      `MCP endpoint: ${MCP_PATH}`,
      "Preview: /preview",
    ].join("\n")
  );
}
