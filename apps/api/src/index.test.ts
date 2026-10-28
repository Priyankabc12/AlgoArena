import assert from "node:assert/strict";
import test from "node:test";
import { app } from "./index.js";

test("POST /execute rejects invalid input", async () => {
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP server address.");

  const response = await fetch(`http://127.0.0.1:${address.port}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_code: 42, language_id: "71" })
  });

  assert.equal(response.status, 400);
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});
