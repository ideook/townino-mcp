import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_PORT ?? 8799);
const externalBaseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, "");
const baseUrl = externalBaseUrl ?? `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await wait(250);
  }
  throw new Error("Timed out waiting for /health");
}

async function rpc(method, params = {}) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000000),
      method,
      params,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`RPC ${method} failed with ${response.status}: ${text}`);
  }

  const payload = JSON.parse(text);
  if (payload.error) {
    throw new Error(`RPC ${method} returned error: ${JSON.stringify(payload.error)}`);
  }
  return payload.result;
}

let child = null;

let output = "";

if (!externalBaseUrl) {
  child = spawn(process.execPath, ["server.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });
}

try {
  await waitForHealth();
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "townino-smoke", version: "0.1.0" },
  });
  const listed = await rpc("tools/list");
  const toolNames = listed.tools.map((tool) => tool.name).sort();

  for (const expected of ["render_places", "search_places"]) {
    if (!toolNames.includes(expected)) {
      throw new Error(`Missing tool ${expected}. Got: ${toolNames.join(", ")}`);
    }
  }

  const searchResult = await rpc("tools/call", {
    name: "search_places",
    arguments: { query: "coffee quiet", maxWalkingMinutes: 15, limit: 3 },
  });
  const places = searchResult.structuredContent?.places ?? [];
  if (places.length < 1) {
    throw new Error("search_places returned no places for coffee quiet");
  }

  const renderResult = await rpc("tools/call", {
    name: "render_places",
    arguments: {
      placeIds: places.map((place) => place.id),
      title: "Smoke test picks",
      note: "Rendered from smoke-test tool output.",
    },
  });
  if (renderResult.structuredContent?.title !== "Smoke test picks") {
    throw new Error("render_places did not echo the requested title");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        tools: toolNames,
        searchCount: places.length,
        firstPlace: places[0].name,
      },
      null,
      2
    )
  );
} finally {
  child?.kill();
  await wait(100);
  if (process.env.SMOKE_VERBOSE === "1") {
    console.error(output.trim());
  }
}
