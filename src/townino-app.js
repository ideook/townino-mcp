import { readFileSync } from "node:fs";
import { join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";

export const APP_NAME = "townino-local-picks";
export const MCP_PATH = "/mcp";
export const WIDGET_URI = "ui://widget/townino-places-v1.html";

export const widgetHtml = readFileSync(
  join(process.cwd(), "public", "townino-widget.html"),
  "utf8"
);

const categories = [
  "coffee",
  "food",
  "culture",
  "outdoors",
  "shopping",
  "nightlife",
  "workspace",
];

const places = [
  {
    id: "place-arc-roast",
    name: "Arc Roast Lab",
    category: "coffee",
    district: "Seongsu",
    summary: "Quiet roastery with filter flights, long tables, and a calm afternoon crowd.",
    tags: ["coffee", "quiet", "solo", "design"],
    rating: 4.8,
    price: "$$",
    walkMinutes: 8,
    openNow: true,
    bestFor: "Reading, solo work, slow coffee",
    hours: "08:00-21:00",
    address: "12 Seongsui-ro 7-gil",
  },
  {
    id: "place-namu-table",
    name: "Namu Table",
    category: "food",
    district: "Yeonnam",
    summary: "Small Korean lunch table known for seasonal rice bowls and banchan refills.",
    tags: ["lunch", "korean", "casual", "seasonal"],
    rating: 4.6,
    price: "$$",
    walkMinutes: 12,
    openNow: true,
    bestFor: "Casual lunch, quick dinner",
    hours: "11:30-20:30",
    address: "28 Donggyo-ro 38-gil",
  },
  {
    id: "place-mono-house",
    name: "Mono House Gallery",
    category: "culture",
    district: "Hannam",
    summary: "Compact independent gallery with rotating photography and object design shows.",
    tags: ["gallery", "photo", "design", "date"],
    rating: 4.5,
    price: "$",
    walkMinutes: 18,
    openNow: false,
    bestFor: "Short culture stop, design browsing",
    hours: "12:00-19:00",
    address: "6 Itaewon-ro 54-gil",
  },
  {
    id: "place-river-loop",
    name: "River Loop Deck",
    category: "outdoors",
    district: "Mangwon",
    summary: "Open riverside deck with sunset views, benches, and nearby bike rental.",
    tags: ["walk", "sunset", "river", "free"],
    rating: 4.7,
    price: "$",
    walkMinutes: 22,
    openNow: true,
    bestFor: "Sunset walks, low-cost plans",
    hours: "Always open",
    address: "Mangwon Hangang Park",
  },
  {
    id: "place-grid-market",
    name: "Grid Market",
    category: "shopping",
    district: "Euljiro",
    summary: "Edited market for stationery, small home goods, and weekend pop-up brands.",
    tags: ["stationery", "gifts", "popup", "design"],
    rating: 4.4,
    price: "$$",
    walkMinutes: 10,
    openNow: true,
    bestFor: "Gifts, browsing, short errands",
    hours: "10:30-20:00",
    address: "19 Mareunnae-ro",
  },
  {
    id: "place-lowlight",
    name: "Lowlight Listening Bar",
    category: "nightlife",
    district: "Haebangchon",
    summary: "Low-volume vinyl bar with two-person booths and a concise natural wine list.",
    tags: ["wine", "vinyl", "date", "evening"],
    rating: 4.9,
    price: "$$$",
    walkMinutes: 16,
    openNow: false,
    bestFor: "Date night, quiet drinks",
    hours: "18:00-01:00",
    address: "44 Sinheung-ro",
  },
  {
    id: "place-maker-desk",
    name: "Maker Desk",
    category: "workspace",
    district: "Mapo",
    summary: "Day-pass workspace with phone booths, fast Wi-Fi, and a simple espresso bar.",
    tags: ["work", "wifi", "meetings", "coffee"],
    rating: 4.3,
    price: "$$",
    walkMinutes: 6,
    openNow: true,
    bestFor: "Focused work, calls, half-day desk",
    hours: "09:00-22:00",
    address: "77 World Cup buk-ro",
  },
  {
    id: "place-tiny-noodle",
    name: "Tiny Noodle Shop",
    category: "food",
    district: "Ikseon",
    summary: "Counter-only noodle shop with two broth choices and a fast-moving line.",
    tags: ["noodles", "solo", "quick", "warm"],
    rating: 4.5,
    price: "$",
    walkMinutes: 5,
    openNow: true,
    bestFor: "Solo meals, rainy days",
    hours: "11:00-21:00",
    address: "9 Supyo-ro 28-gil",
  },
];

const placeOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(categories),
  district: z.string(),
  summary: z.string(),
  tags: z.array(z.string()),
  rating: z.number(),
  price: z.string(),
  walkMinutes: z.number().int(),
  openNow: z.boolean(),
  bestFor: z.string(),
});

const placesOutputSchema = {
  title: z.string(),
  note: z.string(),
  resultCount: z.number().int(),
  places: z.array(placeOutputSchema),
};

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function publicPlace(place) {
  const { hours, address, ...safe } = place;
  return safe;
}

function matchPlace(place, args) {
  const query = normalizeText(args.query);
  const category = args.category;
  const openNow = args.openNow;
  const maxWalkingMinutes = Number(args.maxWalkingMinutes ?? 60);

  if (category && place.category !== category) return false;
  if (typeof openNow === "boolean" && place.openNow !== openNow) return false;
  if (Number.isFinite(maxWalkingMinutes) && place.walkMinutes > maxWalkingMinutes) {
    return false;
  }

  if (!query) return true;

  const haystack = [
    place.name,
    place.category,
    place.district,
    place.summary,
    place.bestFor,
    ...place.tags,
  ]
    .join(" ")
    .toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .some((term) => haystack.includes(term));
}

function rankPlaces(matches) {
  return [...matches].sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.walkMinutes - b.walkMinutes;
  });
}

function selectPlaces(args) {
  const limit = Math.min(Math.max(Number(args.limit ?? 5), 1), 8);
  return rankPlaces(places.filter((place) => matchPlace(place, args))).slice(0, limit);
}

function buildPlacesResponse(selected, title, note) {
  const visiblePlaces = selected.map(publicPlace);
  const structuredContent = {
    title,
    note,
    resultCount: visiblePlaces.length,
    places: visiblePlaces,
  };

  return {
    structuredContent,
    content: [
      {
        type: "text",
        text:
          visiblePlaces.length === 0
            ? "No matching mock places were found."
            : `Found ${visiblePlaces.length} mock place picks.`,
      },
    ],
    _meta: {
      placesById: Object.fromEntries(
        selected.map((place) => [
          place.id,
          {
            hours: place.hours,
            address: place.address,
            tags: place.tags,
          },
        ])
      ),
    },
  };
}

export function createTowninoServer() {
  const server = new McpServer({
    name: APP_NAME,
    version: "0.1.0",
  });

  registerAppResource(
    server,
    "townino-places-widget",
    WIDGET_URI,
    {},
    async () => ({
      contents: [
        {
          uri: WIDGET_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: widgetHtml,
          _meta: {
            ui: {
              prefersBorder: true,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
            "openai/widgetDescription":
              "Interactive cards for mock neighborhood place recommendations.",
            "openai/widgetPrefersBorder": true,
          },
        },
      ],
    })
  );

  registerAppTool(
    server,
    "search_places",
    {
      title: "Search places",
      description:
        "Use this when the user asks for neighborhood place ideas by mood, category, district, walking distance, or open-now status. Returns mock Townino place data without rendering UI.",
      inputSchema: {
        query: z.string().min(1).optional(),
        category: z.enum(categories).optional(),
        maxWalkingMinutes: z.number().int().min(1).max(60).optional(),
        openNow: z.boolean().optional(),
        limit: z.number().int().min(1).max(8).optional(),
      },
      outputSchema: placesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        "openai/toolInvocation/invoking": "Searching local picks...",
        "openai/toolInvocation/invoked": "Local picks ready.",
      },
    },
    async (args) => {
      const selected = selectPlaces(args ?? {});
      return buildPlacesResponse(
        selected,
        "Townino Local Picks",
        "Mock results filtered by your request."
      );
    }
  );

  registerAppTool(
    server,
    "render_places",
    {
      title: "Render places",
      description:
        "Use this when selected Townino place results should be shown in the interactive widget. Call search_places first, then pass placeIds or omit placeIds to render the default top picks.",
      inputSchema: {
        placeIds: z.array(z.string().min(1)).min(1).max(8).optional(),
        title: z.string().min(1).max(80).optional(),
        note: z.string().min(1).max(180).optional(),
      },
      outputSchema: placesOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
      _meta: {
        ui: { resourceUri: WIDGET_URI },
        "openai/outputTemplate": WIDGET_URI,
        "openai/toolInvocation/invoking": "Rendering picks...",
        "openai/toolInvocation/invoked": "Picks rendered.",
      },
    },
    async (args) => {
      const ids = Array.isArray(args?.placeIds) ? args.placeIds : [];
      const selected =
        ids.length > 0
          ? ids.map((id) => places.find((place) => place.id === id)).filter(Boolean)
          : rankPlaces(places).slice(0, 5);

      return buildPlacesResponse(
        selected,
        args?.title ?? "Townino Local Picks",
        args?.note ?? "A visual shortlist from the mock Townino dataset."
      );
    }
  );

  return server;
}

export function sendCorsPreflight(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, mcp-session-id",
    "Access-Control-Expose-Headers": "Mcp-Session-Id",
  });
  res.end();
}

export function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}

export async function handleMcpHttpRequest(req, res) {
  if (req.method === "OPTIONS") {
    sendCorsPreflight(res);
    return;
  }

  const mcpMethods = new Set(["POST", "GET", "DELETE"]);
  if (!req.method || !mcpMethods.has(req.method)) {
    res.writeHead(405, { allow: "POST, GET, DELETE, OPTIONS" }).end("Method Not Allowed");
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

  const server = createTowninoServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on?.("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Internal server error");
    }
  }
}
