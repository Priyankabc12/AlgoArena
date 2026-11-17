import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after, before, beforeEach } from "node:test";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js";
import { prisma } from "../prisma.js";
import { questionsRouter } from "./questions.js";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const testApp = express();
testApp.all("/api/auth/*splat", toNodeHandler(auth));
testApp.use("/api", questionsRouter);

let serverInstance: ReturnType<typeof testApp.listen>;
let baseUrl: string;

const testSuiteId = randomUUID().slice(0, 8);
const testPrefix = `test-${testSuiteId}`;

async function cleanupTestData() {
  await prisma.testCase.deleteMany({
    where: {
      question: {
        slug: { startsWith: testPrefix }
      }
    }
  });
  await prisma.question.deleteMany({
    where: {
      slug: { startsWith: testPrefix }
    }
  });
  await prisma.session.deleteMany({
    where: {
      user: {
        email: { contains: testPrefix }
      }
    }
  });
  await prisma.account.deleteMany({
    where: {
      user: {
        email: { contains: testPrefix }
      }
    }
  });
  await prisma.user.deleteMany({
    where: {
      email: { contains: testPrefix }
    }
  });
}

before(async () => {
  serverInstance = await new Promise((resolve) => {
    const s = testApp.listen(0, () => resolve(s));
  });
  const address = serverInstance.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address.");
  }
  baseUrl = `http://127.0.0.1:${address.port}`;
  await cleanupTestData();
});

after(async () => {
  await cleanupTestData();
  await new Promise<void>((resolve, reject) => {
    serverInstance.close((err) => (err ? reject(err) : resolve()));
  });
  await prisma.$disconnect();
});

async function createTestUser(role: "user" | "admin" = "user") {
  const uid = randomUUID().slice(0, 8);
  const email = `${testPrefix}-${role}-${uid}@example.com`;
  const signUpRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: webOrigin },
    body: JSON.stringify({
      name: `Test ${role}`,
      email,
      password: "password123"
    })
  });
  assert.equal(signUpRes.status, 200, await signUpRes.text());
  const cookie = signUpRes.headers.get("set-cookie")?.split(";", 1)[0]!;
  assert.ok(cookie);

  const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { Cookie: cookie, Origin: webOrigin }
  });
  const session = (await sessionRes.json()) as {
    user: { id: string; email: string; role: string };
  };

  if (role === "admin") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role: "admin" }
    });
  }

  return {
    userId: session.user.id,
    email,
    cookie,
    role
  };
}

test("1. Public list without authentication", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-pub-list-1`;

  await prisma.question.create({
    data: {
      slug,
      title: "Public List Question",
      statement: "Secret statement that should never appear in list items.",
      difficulty: "EASY",
      tags: ["Math", "Intro"],
      timeLimit: 2,
      memoryLimit: 128000,
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "1\n", expectedOutput: "1\n", isSample: true, position: 0 },
          { stdin: "999\n", expectedOutput: "999\n", isSample: false, position: 1 }
        ]
      }
    }
  });

  const res = await fetch(`${baseUrl}/api/questions?search=${slug}`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;

  assert.equal(typeof data.total, "number");
  assert.equal(typeof data.totalPages, "number");
  assert.equal(data.page, 1);
  assert.equal(data.limit, 20);
  assert.ok(Array.isArray(data.items));

  const found = data.items.find((item: any) => item.slug === slug);
  assert.ok(found, "Created question should be in items");
  assert.equal(found.title, "Public List Question");
  assert.equal(found.difficulty, "EASY");
  assert.deepEqual(found.tags, ["Math", "Intro"]);
  assert.equal(found.timeLimit, 2);
  assert.equal(found.memoryLimit, 128000);

  // Security checks: no statement, testCases, creator IDs, or hidden data
  assert.equal(found.statement, undefined);
  assert.equal(found.testCases, undefined);
  assert.equal(found.sampleTestCases, undefined);
  assert.equal(found.createdById, undefined);
  assert.equal(found.createdAt, undefined);
  assert.equal(found.updatedAt, undefined);
});

test("2. Search, difficulty, tag, and combined filters", async () => {
  const admin = await createTestUser("admin");
  const slug1 = `${testPrefix}-filter-alpha-binary`;
  const slug2 = `${testPrefix}-filter-beta-dp`;
  const slug3 = `${testPrefix}-filter-gamma-graph`;

  await prisma.question.createMany({
    data: [
      {
        slug: slug1,
        title: "Alpha Binary Search",
        statement: "Binary search problem",
        difficulty: "EASY",
        tags: ["Search", "Array"],
        createdById: admin.userId
      },
      {
        slug: slug2,
        title: "Beta Dynamic Programming",
        statement: "DP problem",
        difficulty: "MEDIUM",
        tags: ["DP", "Array"],
        createdById: admin.userId
      },
      {
        slug: slug3,
        title: "Gamma Graph Dijkstra",
        statement: "Graph problem",
        difficulty: "HARD",
        tags: ["Graph"],
        createdById: admin.userId
      }
    ]
  });

  // Search by title (case-insensitive)
  const searchTitleRes = await fetch(`${baseUrl}/api/questions?search=binary`);
  const searchTitleData = (await searchTitleRes.json()) as any;
  assert.ok(searchTitleData.items.some((q: any) => q.slug === slug1));
  assert.ok(!searchTitleData.items.some((q: any) => q.slug === slug2));

  // Search by slug (case-insensitive)
  const searchSlugRes = await fetch(`${baseUrl}/api/questions?search=BETA-DP`);
  const searchSlugData = (await searchSlugRes.json()) as any;
  assert.ok(searchSlugData.items.some((q: any) => q.slug === slug2));

  // Difficulty filter
  const diffRes = await fetch(`${baseUrl}/api/questions?difficulty=HARD&search=${testPrefix}`);
  const diffData = (await diffRes.json()) as any;
  assert.equal(diffData.items.length, 1);
  assert.equal(diffData.items[0].slug, slug3);

  // Tag filter
  const tagRes = await fetch(`${baseUrl}/api/questions?tag=Array&search=${testPrefix}`);
  const tagData = (await tagRes.json()) as any;
  assert.equal(tagData.items.length, 2);
  const tagSlugs = tagData.items.map((q: any) => q.slug).sort();
  assert.deepEqual(tagSlugs, [slug1, slug2].sort());

  // Combined filter
  const combRes = await fetch(
    `${baseUrl}/api/questions?search=beta&difficulty=MEDIUM&tag=DP`
  );
  const combData = (await combRes.json()) as any;
  assert.equal(combData.items.length, 1);
  assert.equal(combData.items[0].slug, slug2);

  // Filter returning 0 items
  const emptyRes = await fetch(
    `${baseUrl}/api/questions?search=binary&difficulty=HARD`
  );
  const emptyData = (await emptyRes.json()) as any;
  assert.equal(emptyData.items.length, 0);
  assert.equal(emptyData.total, 0);
  assert.equal(emptyData.totalPages, 0);
});

test("3. Pagination validation and metadata", async () => {
  const admin = await createTestUser("admin");
  const pSlugPrefix = `${testPrefix}-pag`;

  for (let i = 1; i <= 5; i++) {
    await prisma.question.create({
      data: {
        slug: `${pSlugPrefix}-${i}`,
        title: `Paginated Title ${i}`,
        statement: `Statement ${i}`,
        difficulty: "EASY",
        tags: ["Test"],
        createdById: admin.userId
      }
    });
  }

  // Stable sorting by title asc, then id asc
  const pagRes = await fetch(
    `${baseUrl}/api/questions?search=${pSlugPrefix}&page=1&limit=2`
  );
  assert.equal(pagRes.status, 200);
  const pagData = (await pagRes.json()) as any;
  assert.equal(pagData.page, 1);
  assert.equal(pagData.limit, 2);
  assert.equal(pagData.total, 5);
  assert.equal(pagData.totalPages, 3);
  assert.equal(pagData.items.length, 2);
  assert.equal(pagData.items[0].title, "Paginated Title 1");
  assert.equal(pagData.items[1].title, "Paginated Title 2");

  // Page 2
  const pagRes2 = await fetch(
    `${baseUrl}/api/questions?search=${pSlugPrefix}&page=2&limit=2`
  );
  const pagData2 = (await pagRes2.json()) as any;
  assert.equal(pagData2.page, 2);
  assert.equal(pagData2.items.length, 2);
  assert.equal(pagData2.items[0].title, "Paginated Title 3");
  assert.equal(pagData2.items[1].title, "Paginated Title 4");

  // Validation errors on query params
  const invalidPage = await fetch(`${baseUrl}/api/questions?page=0`);
  assert.equal(invalidPage.status, 400);
  const pageErr = (await invalidPage.json()) as any;
  assert.ok(pageErr.fields?.page);

  const invalidPageAlpha = await fetch(`${baseUrl}/api/questions?page=abc`);
  assert.equal(invalidPageAlpha.status, 400);

  const invalidLimit0 = await fetch(`${baseUrl}/api/questions?limit=0`);
  assert.equal(invalidLimit0.status, 400);
  const limitErr = (await invalidLimit0.json()) as any;
  assert.ok(limitErr.fields?.limit);

  const invalidLimit101 = await fetch(`${baseUrl}/api/questions?limit=101`);
  assert.equal(invalidLimit101.status, 400);

  const invalidDiff = await fetch(`${baseUrl}/api/questions?difficulty=INVALID`);
  assert.equal(invalidDiff.status, 400);
  const diffErr = (await invalidDiff.json()) as any;
  assert.ok(diffErr.fields?.difficulty);
});

test("4. Public detail returns only sample cases", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-pub-detail-sample-only`;

  await prisma.question.create({
    data: {
      slug,
      title: "Sample Only Question",
      statement: "Statement for public detail.",
      difficulty: "MEDIUM",
      tags: ["Greedy"],
      timeLimit: 3,
      memoryLimit: 256000,
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "sample_in_1\n", expectedOutput: "sample_out_1\n", isSample: true, position: 0 },
          { stdin: "hidden_in_1\n", expectedOutput: "hidden_out_1\n", isSample: false, position: 1 },
          { stdin: "sample_in_2\n", expectedOutput: "sample_out_2\n", isSample: true, position: 2 }
        ]
      }
    }
  });

  const res = await fetch(`${baseUrl}/api/questions/${slug}`);
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;

  assert.equal(data.slug, slug);
  assert.equal(data.title, "Sample Only Question");
  assert.equal(data.statement, "Statement for public detail.");
  assert.equal(data.difficulty, "MEDIUM");
  assert.deepEqual(data.tags, ["Greedy"]);
  assert.equal(data.timeLimit, 3);
  assert.equal(data.memoryLimit, 256000);

  assert.ok(Array.isArray(data.sampleTestCases));
  assert.equal(data.sampleTestCases.length, 2);
  assert.deepEqual(data.sampleTestCases, [
    { position: 0, stdin: "sample_in_1\n", expectedOutput: "sample_out_1\n" },
    { position: 2, stdin: "sample_in_2\n", expectedOutput: "sample_out_2\n" }
  ]);

  // Ensure isSample is not exposed in sampleTestCases
  assert.equal(data.sampleTestCases[0].isSample, undefined);
  assert.equal(data.sampleTestCases[0].id, undefined);
});

test("5. Public detail never contains hidden input or expected output", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-pub-detail-no-leak`;
  const superSecretInput = `super_secret_input_${randomUUID()}`;
  const superSecretOutput = `super_secret_output_${randomUUID()}`;

  await prisma.question.create({
    data: {
      slug,
      title: "Security Leak Check Question",
      statement: "Check that secret test cases never serialize.",
      difficulty: "EASY",
      tags: ["Security"],
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "sample\n", expectedOutput: "sample\n", isSample: true, position: 0 },
          { stdin: superSecretInput, expectedOutput: superSecretOutput, isSample: false, position: 1 }
        ]
      }
    }
  });

  const res = await fetch(`${baseUrl}/api/questions/${slug}`);
  assert.equal(res.status, 200);
  const rawText = await res.text();

  assert.ok(!rawText.includes(superSecretInput), "Raw response must not contain hidden stdin");
  assert.ok(!rawText.includes(superSecretOutput), "Raw response must not contain hidden expected output");

  const parsed = JSON.parse(rawText);
  assert.equal(parsed.createdById, undefined);
  assert.equal(parsed.createdAt, undefined);
  assert.equal(parsed.updatedAt, undefined);
  assert.equal(parsed.testCases, undefined);
});

test("6. Missing public question returns 404", async () => {
  const res = await fetch(`${baseUrl}/api/questions/completely-non-existent-slug-xyz`);
  assert.equal(res.status, 404);
  const data = (await res.json()) as any;
  assert.equal(data.error, "Question not found.");
});

test("7. Missing session returns 401 for every admin endpoint", async () => {
  const slug = `${testPrefix}-admin-unauth`;

  const getRes = await fetch(`${baseUrl}/api/admin/questions/${slug}`);
  assert.equal(getRes.status, 401);
  const getData = (await getRes.json()) as any;
  assert.ok(getData.error);

  const postRes = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, title: "Test" })
  });
  assert.equal(postRes.status, 401);
  const postData = (await postRes.json()) as any;
  assert.ok(postData.error);

  const patchRes = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, title: "Test" })
  });
  assert.equal(patchRes.status, 401);
  const patchData = (await patchRes.json()) as any;
  assert.ok(patchData.error);
});

test("8. Ordinary user returns 403", async () => {
  const user = await createTestUser("user");
  const slug = `${testPrefix}-admin-forbidden`;

  const getRes = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    headers: { Cookie: user.cookie, Origin: webOrigin }
  });
  assert.equal(getRes.status, 403);

  const postRes = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: user.cookie, Origin: webOrigin },
    body: JSON.stringify({ slug, title: "Test" })
  });
  assert.equal(postRes.status, 403);

  const patchRes = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: user.cookie, Origin: webOrigin },
    body: JSON.stringify({ slug, title: "Test" })
  });
  assert.equal(patchRes.status, 403);
});

test("9. Admin can fetch the full question", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-admin-fetch-full`;

  await prisma.question.create({
    data: {
      slug,
      title: "Full Detail Question",
      statement: "Full statement for admin.",
      difficulty: "HARD",
      tags: ["Trees", "Binary Search"],
      timeLimit: 2.5,
      memoryLimit: 64000,
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "sample_in\n", expectedOutput: "sample_out\n", isSample: true, position: 0 },
          { stdin: "hidden_in\n", expectedOutput: "hidden_out\n", isSample: false, position: 1 }
        ]
      }
    }
  });

  const res = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    headers: { Cookie: admin.cookie, Origin: webOrigin }
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as any;

  assert.equal(data.slug, slug);
  assert.equal(data.title, "Full Detail Question");
  assert.equal(data.statement, "Full statement for admin.");
  assert.equal(data.difficulty, "HARD");
  assert.deepEqual(data.tags, ["Trees", "Binary Search"]);
  assert.equal(data.timeLimit, 2.5);
  assert.equal(data.memoryLimit, 64000);
  assert.ok(data.createdAt);
  assert.ok(data.updatedAt);

  assert.ok(Array.isArray(data.testCases));
  assert.equal(data.testCases.length, 2);
  assert.equal(data.testCases[0].position, 0);
  assert.equal(data.testCases[0].stdin, "sample_in\n");
  assert.equal(data.testCases[0].isSample, true);
  assert.equal(data.testCases[1].position, 1);
  assert.equal(data.testCases[1].stdin, "hidden_in\n");
  assert.equal(data.testCases[1].isSample, false);

  // Unknown slug returns 404 after authorization
  const missingRes = await fetch(`${baseUrl}/api/admin/questions/non-existent-slug-xyz`, {
    headers: { Cookie: admin.cookie, Origin: webOrigin }
  });
  assert.equal(missingRes.status, 404);
  const missingData = (await missingRes.json()) as any;
  assert.equal(missingData.error, "Question not found.");
});

test("10. Invalid create returns 400 and writes nothing", async () => {
  const admin = await createTestUser("admin");
  const badSlug = `${testPrefix}-bad-slug-capital-CHARS`;

  const invalidBody = {
    slug: badSlug,
    title: "", // empty
    statement: "   ", // empty after trim
    difficulty: "IMPOSSIBLE",
    tags: ["Duplicate", "duplicate"], // duplicate case-insensitively
    timeLimit: -1,
    memoryLimit: 0,
    testCases: [
      { stdin: "1\n", expectedOutput: "1\n", isSample: true }
      // missing hidden case!
    ]
  };

  const res = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(invalidBody)
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as any;

  assert.ok(data.fields?.slug);
  assert.ok(data.fields?.title);
  assert.ok(data.fields?.statement);
  assert.ok(data.fields?.difficulty);
  assert.ok(data.fields?.tags);
  assert.ok(data.fields?.timeLimit);
  assert.ok(data.fields?.memoryLimit);
  assert.ok(data.fields?.testCases);

  // Assert nothing written to database
  const count = await prisma.question.count({ where: { slug: badSlug } });
  assert.equal(count, 0);
});

test("11. Create derives creator ID from session", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-create-derive-creator`;

  const body = {
    slug,
    title: "Derive Creator Question",
    statement: "Valid statement.",
    difficulty: "EASY",
    tags: ["Math"],
    timeLimit: 1,
    memoryLimit: 64000,
    createdById: "malicious-user-id", // must be ignored/not accepted
    role: "admin", // must be ignored
    testCases: [
      { stdin: "1\n", expectedOutput: "1\n", isSample: true },
      { stdin: "2\n", expectedOutput: "2\n", isSample: false }
    ]
  };

  const res = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(body)
  });
  assert.equal(res.status, 201);

  const dbQuestion = await prisma.question.findUnique({ where: { slug } });
  assert.ok(dbQuestion);
  assert.equal(dbQuestion.createdById, admin.userId, "createdById must match authenticated admin ID");
});

test("12. Create stores ordered sample and hidden cases", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-create-ordered-cases`;

  const body = {
    slug,
    title: "Ordered Cases Question",
    statement: "Check positions derived from array order.",
    difficulty: "MEDIUM",
    tags: ["Queue"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "first\n", expectedOutput: "1\n", isSample: true },
      { stdin: "second\n", expectedOutput: "2\n", isSample: false },
      { stdin: "third\n", expectedOutput: "3\n", isSample: true },
      { stdin: "fourth\n", expectedOutput: "4\n", isSample: false }
    ]
  };

  const res = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(body)
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as any;

  assert.equal(data.testCases.length, 4);
  assert.equal(data.testCases[0].position, 0);
  assert.equal(data.testCases[0].stdin, "first\n");
  assert.equal(data.testCases[0].isSample, true);

  assert.equal(data.testCases[1].position, 1);
  assert.equal(data.testCases[1].stdin, "second\n");
  assert.equal(data.testCases[1].isSample, false);

  assert.equal(data.testCases[2].position, 2);
  assert.equal(data.testCases[2].stdin, "third\n");
  assert.equal(data.testCases[2].isSample, true);

  assert.equal(data.testCases[3].position, 3);
  assert.equal(data.testCases[3].stdin, "fourth\n");
  assert.equal(data.testCases[3].isSample, false);
});

test("13. Duplicate slug returns 409", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-duplicate-slug`;

  const validBody = {
    slug,
    title: "Duplicate Slug Question",
    statement: "Initial creation.",
    difficulty: "EASY",
    tags: ["Tag1"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "a\n", expectedOutput: "a\n", isSample: true },
      { stdin: "b\n", expectedOutput: "b\n", isSample: false }
    ]
  };

  const firstRes = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(validBody)
  });
  assert.equal(firstRes.status, 201);

  const dupRes = await fetch(`${baseUrl}/api/admin/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(validBody)
  });
  assert.equal(dupRes.status, 409);
  const dupData = (await dupRes.json()) as any;
  assert.deepEqual(dupData, { error: "A question with this slug already exists." });
});

test("14. Edit changes editable fields and preserves creator", async () => {
  const adminOriginal = await createTestUser("admin");
  const adminEditor = await createTestUser("admin");
  const slug = `${testPrefix}-edit-preserve-creator`;

  const initial = await prisma.question.create({
    data: {
      slug,
      title: "Original Title",
      statement: "Original Statement",
      difficulty: "EASY",
      tags: ["OriginalTag"],
      timeLimit: 1,
      memoryLimit: 32000,
      createdById: adminOriginal.userId,
      testCases: {
        create: [
          { stdin: "orig_sample\n", expectedOutput: "orig_out\n", isSample: true, position: 0 },
          { stdin: "orig_hidden\n", expectedOutput: "orig_out_h\n", isSample: false, position: 1 }
        ]
      }
    }
  });

  const updatedBody = {
    slug,
    title: "Updated Title",
    statement: "Updated Statement",
    difficulty: "HARD",
    tags: ["NewTag1", "NewTag2"],
    timeLimit: 3.5,
    memoryLimit: 256000,
    testCases: [
      { stdin: "new_sample\n", expectedOutput: "new_sample_out\n", isSample: true },
      { stdin: "new_hidden\n", expectedOutput: "new_hidden_out\n", isSample: false }
    ]
  };

  const patchRes = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: adminEditor.cookie, Origin: webOrigin },
    body: JSON.stringify(updatedBody)
  });
  assert.equal(patchRes.status, 200);
  const patchData = (await patchRes.json()) as any;

  assert.equal(patchData.title, "Updated Title");
  assert.equal(patchData.statement, "Updated Statement");
  assert.equal(patchData.difficulty, "HARD");
  assert.deepEqual(patchData.tags, ["NewTag1", "NewTag2"]);
  assert.equal(patchData.timeLimit, 3.5);
  assert.equal(patchData.memoryLimit, 256000);
  assert.equal(patchData.testCases.length, 2);
  assert.equal(patchData.testCases[0].stdin, "new_sample\n");

  // Check database persistence and creator preservation
  const dbRecord = await prisma.question.findUnique({
    where: { slug },
    include: { testCases: { orderBy: { position: "asc" } } }
  });
  assert.ok(dbRecord);
  assert.equal(dbRecord.createdById, adminOriginal.userId, "Original creator must be preserved");
  assert.equal(dbRecord.createdAt.toISOString(), initial.createdAt.toISOString(), "Original createdAt preserved");
  assert.equal(dbRecord.title, "Updated Title");
  assert.equal(dbRecord.difficulty, "HARD");
  assert.deepEqual(dbRecord.tags, ["NewTag1", "NewTag2"]);
});

test("15. Invalid edit leaves existing data unchanged", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-invalid-edit-unchanged`;

  await prisma.question.create({
    data: {
      slug,
      title: "Unchanged Title",
      statement: "Unchanged Statement",
      difficulty: "MEDIUM",
      tags: ["Stable"],
      timeLimit: 2,
      memoryLimit: 128000,
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "1\n", expectedOutput: "1\n", isSample: true, position: 0 },
          { stdin: "2\n", expectedOutput: "2\n", isSample: false, position: 1 }
        ]
      }
    }
  });

  const invalidEditBody = {
    slug,
    title: "", // invalid empty title
    statement: "New statement",
    difficulty: "EASY",
    tags: ["Valid"],
    timeLimit: 1,
    memoryLimit: 64000,
    testCases: [{ stdin: "x", expectedOutput: "y", isSample: true }] // missing hidden case
  };

  const res = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(invalidEditBody)
  });
  assert.equal(res.status, 400);

  const dbQuestion = await prisma.question.findUnique({
    where: { slug },
    include: { testCases: true }
  });
  assert.ok(dbQuestion);
  assert.equal(dbQuestion.title, "Unchanged Title");
  assert.equal(dbQuestion.testCases.length, 2);
});

test("16. Edit slug conflict returns 409", async () => {
  const admin = await createTestUser("admin");
  const slugA = `${testPrefix}-slug-a`;
  const slugB = `${testPrefix}-slug-b`;

  await prisma.question.create({
    data: {
      slug: slugA,
      title: "Question A",
      statement: "Statement A",
      difficulty: "EASY",
      tags: ["TagA"],
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "1", expectedOutput: "1", isSample: true, position: 0 },
          { stdin: "2", expectedOutput: "2", isSample: false, position: 1 }
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      slug: slugB,
      title: "Question B",
      statement: "Statement B",
      difficulty: "EASY",
      tags: ["TagB"],
      createdById: admin.userId,
      testCases: {
        create: [
          { stdin: "1", expectedOutput: "1", isSample: true, position: 0 },
          { stdin: "2", expectedOutput: "2", isSample: false, position: 1 }
        ]
      }
    }
  });

  // Attempt to rename Question A to Question B's slug
  const conflictBody = {
    slug: slugB, // Conflict!
    title: "Question A Renamed",
    statement: "Statement A",
    difficulty: "EASY",
    tags: ["TagA"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "1", expectedOutput: "1", isSample: true },
      { stdin: "2", expectedOutput: "2", isSample: false }
    ]
  };

  const conflictRes = await fetch(`${baseUrl}/api/admin/questions/${slugA}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify(conflictBody)
  });
  assert.equal(conflictRes.status, 409);
  const conflictData = (await conflictRes.json()) as any;
  assert.deepEqual(conflictData, { error: "A question with this slug already exists." });

  // Both questions remain unchanged
  assert.ok(await prisma.question.findUnique({ where: { slug: slugA } }));
  assert.ok(await prisma.question.findUnique({ where: { slug: slugB } }));

  // Renaming to a new unused slug succeeds
  const newSlug = `${testPrefix}-slug-a-renamed`;
  const renameRes = await fetch(`${baseUrl}/api/admin/questions/${slugA}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: admin.cookie, Origin: webOrigin },
    body: JSON.stringify({ ...conflictBody, slug: newSlug })
  });
  assert.equal(renameRes.status, 200);
  const renameData = (await renameRes.json()) as any;
  assert.equal(renameData.slug, newSlug);

  // Old slug 404s, new slug returns question
  const oldGet = await fetch(`${baseUrl}/api/questions/${slugA}`);
  assert.equal(oldGet.status, 404);
  const newGet = await fetch(`${baseUrl}/api/questions/${newSlug}`);
  assert.equal(newGet.status, 200);
});

test("17. No delete route exists", async () => {
  const admin = await createTestUser("admin");
  const slug = `${testPrefix}-no-delete`;

  const delAdmin = await fetch(`${baseUrl}/api/admin/questions/${slug}`, {
    method: "DELETE",
    headers: { Cookie: admin.cookie, Origin: webOrigin }
  });
  assert.equal(delAdmin.status, 404);

  const delPublic = await fetch(`${baseUrl}/api/questions/${slug}`, {
    method: "DELETE"
  });
  assert.equal(delPublic.status, 404);

  const delRoot = await fetch(`${baseUrl}/api/questions`, {
    method: "DELETE"
  });
  assert.equal(delRoot.status, 404);
});
