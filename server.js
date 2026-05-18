import { createServer } from "node:http";
import {
  APP_NAME,
  MCP_PATH,
  handleMcpHttpRequest,
  sendCorsPreflight,
  sendJson,
  widgetHtml,
} from "./src/townino-app.js";

const port = Number(process.env.PORT ?? 8787);

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end("Missing URL");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS" && url.pathname.startsWith(MCP_PATH)) {
    sendCorsPreflight(res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      [
        "Townino Local Picks MCP server",
        `MCP endpoint: http://localhost:${port}${MCP_PATH}`,
        `Preview: http://localhost:${port}/preview`,
      ].join("\n")
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      app: APP_NAME,
      mcp: MCP_PATH,
      preview: "/preview",
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/preview") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(widgetHtml);
    return;
  }

  if (url.pathname === MCP_PATH) {
    await handleMcpHttpRequest(req, res);
    return;
  }

  res.writeHead(404).end("Not Found");
});

httpServer.listen(port, () => {
  console.log(`Townino MCP server listening on http://localhost:${port}${MCP_PATH}`);
});
