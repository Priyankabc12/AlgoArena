import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "./auth.js";
import { prisma } from "./prisma.js";

export const app = express();
const port = Number(process.env.PORT ?? 4000);
const judge0Url = process.env.JUDGE0_URL ?? "http://localhost:2358";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: webOrigin, credentials: true }));
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/execute", async (request, response) => {
  let session;

  try {
    session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  } catch {
    response.status(500).json({ error: "Authentication is unavailable." });
    return;
  }

  if (!session) {
    response.status(401).json({ error: "Sign in to execute code." });
    return;
  }

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

type TestCaseInput = {
  stdin?: string;
  expectedOutput: string;
  isSample?: boolean;
};

function isTestCaseInput(value: unknown): value is TestCaseInput {
  if (typeof value !== "object" || value === null) return false;
  const testCase = value as Record<string, unknown>;
  return (testCase.stdin === undefined || typeof testCase.stdin === "string")
    && typeof testCase.expectedOutput === "string"
    && (testCase.isSample === undefined || typeof testCase.isSample === "boolean");
}

app.post("/questions", async (request, response) => {
  let session;

  try {
    session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  } catch {
    response.status(500).json({ error: "Authentication is unavailable." });
    return;
  }

  if (!session) {
    response.status(401).json({ error: "Sign in to create questions." });
    return;
  }

  if (session.user.role !== "admin") {
    response.status(403).json({ error: "Admin access is required." });
    return;
  }

  const { slug, title, statement, timeLimit, memoryLimit, testCases } = request.body ?? {};
  const valid = typeof slug === "string"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    && typeof title === "string"
    && title.trim().length > 0
    && typeof statement === "string"
    && statement.trim().length > 0
    && (timeLimit === undefined || (typeof timeLimit === "number" && Number.isFinite(timeLimit) && timeLimit > 0))
    && (memoryLimit === undefined || (Number.isInteger(memoryLimit) && memoryLimit > 0))
    && Array.isArray(testCases)
    && testCases.length > 0
    && testCases.every(isTestCaseInput);

  if (!valid) {
    response.status(400).json({ error: "A valid slug, title, statement, limits, and at least one test case are required." });
    return;
  }

  try {
    const question = await prisma.question.create({
      data: {
        slug,
        title: title.trim(),
        statement: statement.trim(),
        ...(timeLimit === undefined ? {} : { timeLimit }),
        ...(memoryLimit === undefined ? {} : { memoryLimit }),
        createdBy: { connect: { id: session.user.id } },
        testCases: {
          create: testCases.map((testCase: TestCaseInput, position: number) => ({
            stdin: testCase.stdin ?? "",
            expectedOutput: testCase.expectedOutput,
            isSample: testCase.isSample ?? false,
            position
          }))
        }
      },
      include: { testCases: true }
    });
    response.status(201).json(question);
  } catch {
    response.status(500).json({ error: "Could not create question." });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}
