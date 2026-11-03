import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { app } from "./index.js";
import { prisma } from "./prisma.js";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

async function startServer() {
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

test("POST /execute rejects unauthenticated requests", async () => {
  const server = await startServer();

  try {
    const health = await fetch(`${server.baseUrl}/health`);
    assert.equal(health.status, 200);

    const response = await fetch(`${server.baseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: 42, language_id: "71" })
    });

    assert.equal(response.status, 401);
  } finally {
    await server.close();
  }
});

test("email auth protects execution and tracks the admin who creates a question", async () => {
  const server = await startServer();
  const suffix = randomUUID();
  const email = `admin-${suffix}@example.com`;
  const slug = `question-${suffix}`;
  let userId: string | undefined;

  try {
    const signUp = await fetch(`${server.baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: webOrigin },
      body: JSON.stringify({ name: "Test Admin", email, password: "password123" })
    });
    assert.equal(signUp.status, 200, await signUp.text());
    const cookie = signUp.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(cookie);

    const sessionResponse = await fetch(`${server.baseUrl}/api/auth/get-session`, {
      headers: { Cookie: cookie, Origin: webOrigin }
    });
    const session = await sessionResponse.json() as { user: { id: string; email: string; role: string } };
    assert.equal(session.user.email, email);
    assert.equal(session.user.role, "user");
    userId = session.user.id;

    const invalidExecution = await fetch(`${server.baseUrl}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: webOrigin },
      body: JSON.stringify({ source_code: 42, language_id: "71" })
    });
    assert.equal(invalidExecution.status, 400);

    const questionBody = {
      slug,
      title: "Test Question",
      statement: "Print the input.",
      testCases: [{ stdin: "hello\n", expectedOutput: "hello\n", isSample: true }]
    };
    const forbidden = await fetch(`${server.baseUrl}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: webOrigin },
      body: JSON.stringify(questionBody)
    });
    assert.equal(forbidden.status, 403);

    await prisma.user.update({ where: { id: userId }, data: { role: "admin" } });

    const invalidQuestion = await fetch(`${server.baseUrl}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: webOrigin },
      body: JSON.stringify({ ...questionBody, testCases: [] })
    });
    assert.equal(invalidQuestion.status, 400);
    assert.equal(await prisma.question.count({ where: { slug } }), 0);

    const created = await fetch(`${server.baseUrl}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie, Origin: webOrigin },
      body: JSON.stringify(questionBody)
    });
    assert.equal(created.status, 201, await created.text());
    const question = await prisma.question.findUniqueOrThrow({ where: { slug } });
    assert.equal(question.createdById, userId);

    const signOut = await fetch(`${server.baseUrl}/api/auth/sign-out`, {
      method: "POST",
      headers: { Cookie: cookie, Origin: webOrigin }
    });
    assert.equal(signOut.status, 200);

    const signedOutSession = await fetch(`${server.baseUrl}/api/auth/get-session`, {
      headers: { Cookie: cookie, Origin: webOrigin }
    });
    assert.equal(await signedOutSession.json(), null);

    const signIn = await fetch(`${server.baseUrl}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: webOrigin },
      body: JSON.stringify({ email, password: "password123" })
    });
    assert.equal(signIn.status, 200, await signIn.text());
    const signedInCookie = signIn.headers.get("set-cookie")?.split(";", 1)[0];
    assert.ok(signedInCookie);

    const signedInSession = await fetch(`${server.baseUrl}/api/auth/get-session`, {
      headers: { Cookie: signedInCookie, Origin: webOrigin }
    });
    assert.equal((await signedInSession.json() as { user: { id: string } }).user.id, userId);
  } finally {
    await prisma.question.deleteMany({ where: { slug } });
    if (userId) await prisma.user.deleteMany({ where: { id: userId } });
    await server.close();
  }
});
