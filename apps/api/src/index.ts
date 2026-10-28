import cors from "cors";
import express from "express";

export const app = express();
const port = Number(process.env.PORT ?? 4000);
const judge0Url = process.env.JUDGE0_URL ?? "http://localhost:2358";

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/execute", async (request, response) => {
  const { source_code, language_id, stdin } = request.body ?? {};

  if (typeof source_code !== "string" || !Number.isInteger(language_id) || (stdin !== undefined && typeof stdin !== "string")) {
    response.status(400).json({ error: "source_code (string), language_id (integer), and optional stdin (string) are required." });
    return;
  }

  try {
    const judgeResponse = await fetch(`${judge0Url}/submissions?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code, language_id, stdin })
    });
    const result = await judgeResponse.json();
    response.status(judgeResponse.status).json(result);
  } catch {
    response.status(502).json({ error: "Judge0 is unavailable." });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}
