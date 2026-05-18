import { handleMcpHttpRequest } from "../src/townino-app.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  await handleMcpHttpRequest(req, res);
}
