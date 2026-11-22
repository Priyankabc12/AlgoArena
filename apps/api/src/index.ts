import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "./auth.js";
import { executionsRouter } from "./executions.js";
import { questionsRouter } from "./routes/questions.js";
import { prisma } from "./prisma.js";
import { legacyExecutionSchema, questionInputSchema } from "./validation.js";

export const app = express();
const port = Number(process.env.PORT ?? 4000);
const judge0Url = process.env.JUDGE0_URL ?? "http://localhost:2358";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use("/api", executionsRouter);

app.use("/api", questionsRouter);

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

  const parsed = legacyExecutionSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "source_code (string), language_id (integer), and optional stdin (string) are required." });
    return;
  }

  const { source_code, language_id, stdin } = parsed.data;

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

  const parsed = questionInputSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ error: "A valid slug, title, statement, limits, and at least one test case are required." });
    return;
  }

  const { slug, title, statement, timeLimit, memoryLimit, testCases } = parsed.data;

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
          create: testCases.map((testCase, position) => ({
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
