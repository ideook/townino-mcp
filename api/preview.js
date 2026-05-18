import { widgetHtml } from "../src/townino-app.js";

export default function handler(_req, res) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(widgetHtml);
}
