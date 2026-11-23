import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import { app } from "../index.js";
import { prisma } from "../prisma.js";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const prefix = `profile-test-${randomUUID()}`;
const slugs = [`${prefix}-one`, `${prefix}-two`];
const userIds = [];

async function startServer() {
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP server address.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

async function createUser(baseUrl, label) {
  const email = `${prefix}-${label}@example.test`;
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: webOrigin },
    body: JSON.stringify({ name: `Profile ${label}`, email, password: "password123" })
  });
  assert.equal(response.status, 200, await response.text());
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie, "Sign-up should return a session cookie");

  const sessionResponse = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { Cookie: cookie, Origin: webOrigin }
  });
  const session = await sessionResponse.json();
  userIds.push(session.user.id);
  return { cookie, userId: session.user.id };
}

async function cleanup() {
  await prisma.submission.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.question.deleteMany({ where: { slug: { in: slugs } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

after(async () => {
  try {
    await cleanup();
  } finally {
    await prisma.$disconnect();
  }
});

test("profile endpoints authenticate, scope data, paginate, and validate name updates", async () => {
  const server = await startServer();

  try {
    const signedOut = await fetch(`${server.baseUrl}/api/profile`);
    assert.equal(signedOut.status, 401);

    const first = await createUser(server.baseUrl, "first");
    const second = await createUser(server.baseUrl, "second");

    const firstProfile = await fetch(`${server.baseUrl}/api/profile`, {
      headers: { Cookie: first.cookie }
    });
    assert.equal(firstProfile.status, 200);
    assert.equal(firstProfile.headers.get("cache-control"), "private, no-store");
    const firstProfileBody = await firstProfile.json();
    assert.equal(firstProfileBody.name, "Profile first");
    assert.equal(firstProfileBody.email, `${prefix}-first@example.test`);
    assert.equal("password" in firstProfileBody, false);

    for (const [index, slug] of slugs.entries()) {
      await prisma.question.create({
        data: {
          slug,
          title: `Profile Test Question ${index + 1}`,
          statement: "Profile API fixture.",
          createdById: first.userId
        }
      });
    }

    const questions = await prisma.question.findMany({ where: { slug: { in: slugs } } });
    const questionOne = questions.find((question) => question.slug === slugs[0]);
    const questionTwo = questions.find((question) => question.slug === slugs[1]);
    assert.ok(questionOne && questionTwo);

    const baseTime = Date.UTC(2026, 0, 1);
    for (let index = 0; index < 21; index += 1) {
      await prisma.submission.create({
        data: {
          userId: first.userId,
          questionId: index < 2 ? questionOne.id : questionTwo.id,
          sourceCode: "print('test')",
          language: "python",
          status: index < 2 ? "ACCEPTED" : index === 3 ? "PENDING" : "WRONG_ANSWER",
          createdAt: new Date(baseTime + Math.floor(index / 2) * 1000)
        }
      });
    }

    const stats = await fetch(`${server.baseUrl}/api/profile/stats`, {
      headers: { Cookie: first.cookie }
    });
    assert.equal(stats.status, 200);
    assert.equal(stats.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await stats.json(), { totalSubmissions: 21, solvedQuestions: 1 });

    const firstPage = await fetch(`${server.baseUrl}/api/profile/submissions?page=1`, {
      headers: { Cookie: first.cookie }
    });
    assert.equal(firstPage.status, 200);
    assert.equal(firstPage.headers.get("cache-control"), "private, no-store");
    const firstPageBody = await firstPage.json();
    assert.equal(firstPageBody.submissions.length, 20);
    assert.equal(firstPageBody.hasNextPage, true);
    assert.equal(firstPageBody.submissions[0].question.title, "Profile Test Question 2");
    assert.equal(firstPageBody.submissions[0].question.slug, slugs[1]);
    assert.equal("sourceCode" in firstPageBody.submissions[0], false);
    const repeatedFirstPage = await fetch(`${server.baseUrl}/api/profile/submissions?page=1`, {
      headers: { Cookie: first.cookie }
    });
    assert.deepEqual(
      (await repeatedFirstPage.json()).submissions.map((submission) => submission.id),
      firstPageBody.submissions.map((submission) => submission.id)
    );

    const secondPage = await fetch(`${server.baseUrl}/api/profile/submissions?page=2`, {
      headers: { Cookie: first.cookie }
    });
    const secondPageBody = await secondPage.json();
    assert.equal(secondPage.status, 200);
    assert.equal(secondPageBody.submissions.length, 1);
    assert.equal(secondPageBody.hasNextPage, false);

    const invalidPage = await fetch(`${server.baseUrl}/api/profile/submissions?page=0`, {
      headers: { Cookie: first.cookie }
    });
    assert.equal(invalidPage.status, 400);

    const otherStats = await fetch(`${server.baseUrl}/api/profile/stats`, {
      headers: { Cookie: second.cookie }
    });
    assert.deepEqual(await otherStats.json(), { totalSubmissions: 0, solvedQuestions: 0 });
    const otherHistory = await fetch(`${server.baseUrl}/api/profile/submissions`, {
      headers: { Cookie: second.cookie }
    });
    assert.deepEqual((await otherHistory.json()).submissions, []);

    const invalidUpdates = [
      { body: {}, expectedError: 400 },
      { body: { name: "   " }, expectedError: 400 },
      { body: { name: "x".repeat(51) }, expectedError: 400 },
      { body: { name: "Changed", role: "admin" }, expectedError: 400 }
    ];
    for (const update of invalidUpdates) {
      const response = await fetch(`${server.baseUrl}/api/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Origin: webOrigin, Cookie: first.cookie },
        body: JSON.stringify(update.body)
      });
      assert.equal(response.status, update.expectedError);
    }

    const wrongOrigin = await fetch(`${server.baseUrl}/api/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: "https://untrusted.example", Cookie: first.cookie },
      body: JSON.stringify({ name: "Changed" })
    });
    assert.equal(wrongOrigin.status, 403);

    const unchangedUser = await prisma.user.findUniqueOrThrow({ where: { id: first.userId } });
    assert.equal(unchangedUser.name, "Profile first");

    const changed = await fetch(`${server.baseUrl}/api/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: webOrigin, Cookie: first.cookie },
      body: JSON.stringify({ name: " Ada Lovelace " })
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await changed.json(), { name: "Ada Lovelace" });

    const savedUser = await prisma.user.findUniqueOrThrow({ where: { id: first.userId } });
    assert.equal(savedUser.name, "Ada Lovelace");
    assert.equal(savedUser.role, "user");
  } finally {
    await server.close();
  }
});
