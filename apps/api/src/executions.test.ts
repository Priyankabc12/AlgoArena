import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "./auth.js";
import { createExecutionsRouter } from "./executions.js";
import { SubmissionStatus } from "./generated/prisma/client.js";
import { executeWithJudge0 } from "./judge0.js";
import { prisma } from "./prisma.js";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

async function startServer() {
  const app = express();
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.use("/api", createExecutionsRouter(async ({ expectedOutput, stdin }) => ({
    status: stdin.includes("hidden") ? SubmissionStatus.WRONG_ANSWER : SubmissionStatus.ACCEPTED,
    runtimeMs: 12,
    memoryKb: 2048,
    actualOutput: stdin.includes("hidden") ? "wrong\n" : expectedOutput,
    stdout: stdin.includes("hidden") ? "wrong\n" : expectedOutput,
    diagnostic: stdin.includes("hidden") ? "hidden diagnostic" : undefined
  })));

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP server address.");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

after(() => prisma.$disconnect());

test("Judge0 client sends fixed Python configuration and normalizes metrics", async () => {
  const originalFetch = globalThis.fetch;
  let body: Record<string, unknown> | undefined;

  globalThis.fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      stdout: "5\n",
      time: "0.012",
      memory: 3012.4,
      status: { id: 3, description: "Accepted" }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  try {
    const result = await executeWithJudge0({
      sourceCode: "print(5)",
      stdin: "",
      expectedOutput: "5\n",
      timeLimit: 2,
      memoryLimit: 128000
    });

    assert.equal(body?.language_id, 71);
    assert.equal(body?.expected_output, "5\n");
    assert.equal(result.status, SubmissionStatus.ACCEPTED);
    assert.equal(result.runtimeMs, 12);
    assert.equal(result.memoryKb, 3012);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Judge0 preserves Python diagnostics after a program prints output", async () => {
  const originalFetch = globalThis.fetch;
  const traceback = 'File "script.py", line 2, in <module>\nEOFError: EOF when reading a line\n';
  globalThis.fetch = async () => Response.json({
    stdout: "starting\n",
    stderr: traceback,
    status: { id: 11, description: "Runtime Error" }
  });

  try {
    const result = await executeWithJudge0({
      sourceCode: "print('starting')\ninput()",
      stdin: "",
      expectedOutput: "",
      timeLimit: 2,
      memoryLimit: 128000
    });
    assert.equal(result.status, SubmissionStatus.RUNTIME_ERROR);
    assert.equal(result.stdout, "starting\n");
    assert.equal(result.diagnostic, traceback);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("run stays ephemeral while submit saves history and redacts hidden cases", async () => {
  const server = await startServer();
  const suffix = randomUUID();
  const email = `runner-${suffix}@example.com`;
  const otherEmail = `other-runner-${suffix}@example.com`;
  const slug = `execution-${suffix}`;
  let userId: string | undefined;
  let otherUserId: string | undefined;

  try {
    const unauthorized = await fetch(`${server.baseUrl}/api/executions/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionSlug: slug, sourceCode: "print(5)" })
    });
    assert.equal(unauthorized.status, 401);

    const signUp = await fetch(`${server.baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: webOrigin },
      body: JSON.stringify({ name: "Test Runner", email, password: "password123" })
    });
    assert.equal(signUp.status, 200, await signUp.text());
    const cookie = signUp.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);

    const sessionResponse = await fetch(`${server.baseUrl}/api/auth/get-session`, {
      headers: { Cookie: cookie, Origin: webOrigin }
    });
    const session = await sessionResponse.json() as { user: { id: string } };
    userId = session.user.id;

    await prisma.question.create({
      data: {
        slug,
        title: "Execution test",
        statement: "Print five.",
        createdById: userId,
        testCases: {
          create: [
            { position: 0, stdin: "sample-secret\n", expectedOutput: "5\n", isSample: true },
            { position: 1, stdin: "hidden-secret\n", expectedOutput: "5\n", isSample: false }
          ]
        }
      }
    });

    const invalid = await fetch(`${server.baseUrl}/api/executions/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ questionSlug: slug, sourceCode: "", userId })
    });
    assert.equal(invalid.status, 400);

    const run = await fetch(`${server.baseUrl}/api/executions/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ questionSlug: slug, sourceCode: "print(5)" })
    });
    assert.equal(run.status, 200);
    const runBody = await run.json() as { total: number; results: Array<Record<string, unknown>> };
    assert.equal(runBody.total, 1);
    assert.equal(runBody.results[0]?.stdin, "sample-secret\n");
    assert.equal(await prisma.submission.count({ where: { userId } }), 0);

    const submit = await fetch(`${server.baseUrl}/api/executions/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ questionSlug: slug, sourceCode: "print(5)" })
    });
    assert.equal(submit.status, 201);
    const submitBody = await submit.json() as {
      submissionId: string;
      status: string;
      passed: number;
      total: number;
      results: Array<Record<string, unknown>>;
    };
    assert.equal(submitBody.status, SubmissionStatus.WRONG_ANSWER);
    assert.equal(submitBody.passed, 1);
    assert.equal(submitBody.total, 2);
    assert.equal(submitBody.results[0]?.stdin, "sample-secret\n");
    assert.equal(submitBody.results[1]?.isSample, false);
    assert.equal("stdin" in submitBody.results[1]!, false);
    assert.equal("expectedOutput" in submitBody.results[1]!, false);
    assert.equal(submitBody.results[0]?.stdout, "5\n");
    assert.equal("actualOutput" in submitBody.results[1]!, false);
    assert.equal("stdout" in submitBody.results[1]!, false);
    assert.equal("diagnostic" in submitBody.results[1]!, false);

    const history = await fetch(`${server.baseUrl}/api/submissions?questionSlug=${slug}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(history.status, 200);
    const historyBody = await history.json() as { total: number; items: Array<Record<string, unknown>> };
    assert.equal(historyBody.total, 1);
    assert.equal("sourceCode" in historyBody.items[0]!, false);

    const detail = await fetch(`${server.baseUrl}/api/submissions/${submitBody.submissionId}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json() as { results: Array<Record<string, unknown>> };
    assert.equal("stdin" in detailBody.results[1]!, false);
    assert.equal("expectedOutput" in detailBody.results[1]!, false);
    assert.equal("actualOutput" in detailBody.results[1]!, false);

    const otherSignUp = await fetch(`${server.baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: webOrigin },
      body: JSON.stringify({ name: "Other Runner", email: otherEmail, password: "password123" })
    });
    assert.equal(otherSignUp.status, 200);
    const otherCookie = otherSignUp.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(otherCookie);
    otherUserId = (await prisma.user.findUniqueOrThrow({ where: { email: otherEmail } })).id;

    const privateDetail = await fetch(`${server.baseUrl}/api/submissions/${submitBody.submissionId}`, {
      headers: { Cookie: otherCookie }
    });
    assert.equal(privateDetail.status, 404);
  } finally {
    await prisma.question.deleteMany({ where: { slug } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    if (otherUserId) await prisma.user.deleteMany({ where: { id: otherUserId } });
    await server.close();
  }
});
