import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { SubmissionStatus } from "./generated/prisma/client.js";

const activeUserId = "profile-seed-active";
const users = [
  { id: activeUserId, email: "profile-active@example.test", name: "Ada Lovelace" },
  { id: "profile-seed-empty", email: "profile-empty@example.test", name: "Grace Hopper" }
];

const questions = [
  {
    slug: "profile-seed-sum",
    title: "Sum Two Integers",
    statement: "Read two space-separated integers and print their sum.",
    testCases: [
      { position: 0, stdin: "2 3\n", expectedOutput: "5\n", isSample: true },
      { position: 1, stdin: "-3 1\n", expectedOutput: "-2\n", isSample: false }
    ]
  },
  {
    slug: "profile-seed-double",
    title: "Double an Integer",
    statement: "Read one integer and print twice its value.",
    testCases: [
      { position: 0, stdin: "4\n", expectedOutput: "8\n", isSample: true },
      { position: 1, stdin: "-3\n", expectedOutput: "-6\n", isSample: false }
    ]
  }
] as const;


const learnerNames = [
  "Maya Patel", "Liam Chen", "Zara Khan", "Noah Reyes", "Aisha Okafor",
  "Oliver Park", "Priya Shah", "Lucas Costa", "Amara Singh", "Theo Nguyen"
];

const learners = learnerNames.map((name, index) => {
  const number = String(index + 1).padStart(2, "0");
  return { id: `profile-seed-learner-${number}`, email: `learner-${number}@example.test`, name };
});

const practiceQuestions = [
  {
    slug: "profile-seed-sum-list",
    title: "Sum a List",
    difficulty: "EASY",
    tags: ["arrays","math"],
    statement: "Read space-separated integers on one line and print their sum.",
    solution: "print(sum(map(int, input().split())))",
    cases: [
      ["1 2 3", "6"],
      ["-3 0 2", "-1"],
      ["7", "7"]
    ]
  },
  {
    slug: "profile-seed-max-temperature",
    title: "Highest Temperature",
    difficulty: "EASY",
    tags: ["arrays"],
    statement: "Read one or more space-separated integers and print the largest.",
    solution: "print(max(map(int, input().split())))",
    cases: [
      ["8 3 10 4", "10"],
      ["-7 -2 -9", "-2"],
      ["12", "12"]
    ]
  },
  {
    slug: "profile-seed-palindrome",
    title: "Palindrome Check",
    difficulty: "EASY",
    tags: ["strings","two-pointers"],
    statement: "Read one lowercase word and print YES if it is a palindrome or NO otherwise.",
    solution: "word = input()\nprint('YES' if word == word[::-1] else 'NO')",
    cases: [
      ["level", "YES"],
      ["python", "NO"],
      ["a", "YES"]
    ]
  },
  {
    slug: "profile-seed-count-vowels",
    title: "Count the Vowels",
    difficulty: "EASY",
    tags: ["strings"],
    statement: "Read a lowercase line and count the letters a, e, i, o, and u.",
    solution: "print(sum(char in 'aeiou' for char in input()))",
    cases: [
      ["algo arena", "5"],
      ["rhythm", "0"],
      ["queue", "4"]
    ]
  },
  {
    slug: "profile-seed-anagrams",
    title: "Anagram Check",
    difficulty: "MEDIUM",
    tags: ["strings","hash-map"],
    statement: "Read two lowercase words on separate lines and print YES if they contain the same letters with the same frequencies or NO otherwise.",
    solution: "from collections import Counter\nprint('YES' if Counter(input()) == Counter(input()) else 'NO')",
    cases: [
      ["listen\nsilent", "YES"],
      ["aab\nabb", "NO"],
      ["abc\nab", "NO"]
    ]
  },
  {
    slug: "profile-seed-target-pair",
    title: "Target Pair",
    difficulty: "MEDIUM",
    tags: ["arrays","hash-map"],
    statement: "Read a target integer, then a line of integers. Print YES if two distinct positions sum to the target or NO otherwise.",
    solution: "target = int(input())\nseen = set()\nfor number in map(int, input().split()):\n    if target - number in seen:\n        print('YES')\n        break\n    seen.add(number)\nelse:\n    print('NO')",
    cases: [
      ["9\n2 7 11 15", "YES"],
      ["6\n3", "NO"],
      ["6\n3 3", "YES"]
    ]
  },
  {
    slug: "profile-seed-balanced-brackets",
    title: "Balanced Brackets",
    difficulty: "MEDIUM",
    tags: ["strings","stack"],
    statement: "Read a line containing only (), [], and {} brackets. Print YES if the brackets are balanced and properly nested or NO otherwise.",
    solution: "pairs = {')': '(', ']': '[', '}': '{'}\nstack = []\nfor char in input():\n    if char in '([{':\n        stack.append(char)\n    elif not stack or stack.pop() != pairs[char]:\n        print('NO')\n        break\nelse:\n    print('NO' if stack else 'YES')",
    cases: [
      ["{[()]}", "YES"],
      ["([)]", "NO"],
      ["]", "NO"]
    ]
  },
  {
    slug: "profile-seed-max-subarray",
    title: "Maximum Subarray Sum",
    difficulty: "MEDIUM",
    tags: ["arrays","dynamic-programming"],
    statement: "Read one or more space-separated integers and print the greatest sum of any nonempty contiguous subarray.",
    solution: "numbers = iter(map(int, input().split()))\nbest = current = next(numbers)\nfor number in numbers:\n    current = max(number, current + number)\n    best = max(best, current)\nprint(best)",
    cases: [
      ["-2 1 -3 4 -1 2 1 -5 4", "6"],
      ["-8 -3 -7", "-3"],
      ["5 -1 4", "8"]
    ]
  },
  {
    slug: "profile-seed-histogram",
    title: "Largest Histogram Rectangle",
    difficulty: "HARD",
    tags: ["arrays","stack"],
    statement: "Read space-separated nonnegative bar heights. Each bar has width one. Print the largest rectangular area under the bars.",
    solution: "heights = list(map(int, input().split())) + [0]\nstack = []\nbest = 0\nfor index, height in enumerate(heights):\n    while stack and heights[stack[-1]] > height:\n        top = stack.pop()\n        left = stack[-1] if stack else -1\n        best = max(best, heights[top] * (index - left - 1))\n    stack.append(index)\nprint(best)",
    cases: [
      ["2 1 5 6 2 3", "10"],
      ["2 2 2", "6"],
      ["0 0", "0"]
    ]
  },
  {
    slug: "profile-seed-edit-distance",
    title: "Edit Distance",
    difficulty: "HARD",
    tags: ["strings","dynamic-programming"],
    statement: "Read two words on separate lines. Print the minimum number of single-character insertions, deletions, and replacements needed to turn the first into the second.",
    solution: "first, second = input(), input()\nrow = list(range(len(second) + 1))\nfor index, left in enumerate(first, 1):\n    next_row = [index]\n    for column, right in enumerate(second, 1):\n        next_row.append(min(row[column] + 1, next_row[-1] + 1, row[column - 1] + (left != right)))\n    row = next_row\nprint(row[-1])",
    cases: [
      ["kitten\nsitting", "3"],
      ["same\nsame", "0"],
      ["abc\nyabd", "2"]
    ]
  }
] as const;

const failedAttempts = [
  { status: SubmissionStatus.WRONG_ANSWER, sourceCode: "print('wrong')", actualOutput: "wrong\n" },
  { status: SubmissionStatus.RUNTIME_ERROR, sourceCode: "raise RuntimeError('example')", actualOutput: "" },
  { status: SubmissionStatus.COMPILATION_ERROR, sourceCode: "print(", actualOutput: "" },
  { status: SubmissionStatus.TIME_LIMIT_EXCEEDED, sourceCode: "while True:\n    pass", actualOutput: "" }
] as const;

const dayMs = 24 * 60 * 60 * 1000;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const host = new URL(databaseUrl).hostname;
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    throw new Error("Profile fixtures require a local development database.");
  }

  const { prisma } = await import("./prisma.js");
  try {
    const password = await hashPassword("ProfileSeed123!");
    await prisma.$transaction(async (db) => {
      const seededAt = new Date();
      const activeUsers: { id: string; createdAt: Date }[] = [];
      for (const user of [...users, ...learners]) {
        const account = await db.user.upsert({
          where: { id: user.id, email: user.email },
          update: {},
          create: {
            ...user,
            createdAt: new Date(seededAt.getTime() - 90 * dayMs),
            accounts: {
              create: {
                id: `${user.id}-credential`,
                accountId: user.id,
                providerId: "credential",
                password
              }
            }
          },
          select: { id: true, createdAt: true }
        });
        if (account.id !== "profile-seed-empty") activeUsers.push(account);
      }

      for (const [questionIndex, fixture] of questions.entries()) {
        const { testCases, ...fields } = fixture;
        const question = await db.question.upsert({
          where: { slug: fields.slug, createdById: activeUserId },
          update: {},
          create: {
            ...fields,
            createdById: activeUserId,
            tags: ["math"],
            testCases: { create: [...testCases] }
          },
          select: { id: true }
        });

        const isSolved = questionIndex === 0;
        const createdAt = new Date();
        const attempts = Array.from({ length: isSolved ? 2 : 19 }, (_, index) => {
          const pending = !isSolved && index === 18;
          const status = isSolved ? SubmissionStatus.ACCEPTED
            : pending ? SubmissionStatus.PENDING
            : SubmissionStatus.WRONG_ANSWER;
          const attemptNumber = isSolved ? index + 1 : index + 3;
          return {
            id: `profile-seed-submission-${String(attemptNumber).padStart(2, "0")}`,
            userId: activeUserId,
            questionId: question.id,
            sourceCode: isSolved ? "print(sum(map(int, input().split())))" : "print(int(input()))",
            status,
            runtimeMs: pending ? null : 12,
            memoryKb: pending ? null : 2048,
            createdAt
          };
        });
        await db.submission.createMany({ data: attempts, skipDuplicates: true });
      }

      for (const [questionIndex, fixture] of practiceQuestions.entries()) {
        const { cases, solution, tags, ...fields } = fixture;
        const testCases = cases.map(([input, output], position) => ({
          position,
          stdin: `${input}\n`,
          expectedOutput: `${output}\n`,
          isSample: position === 0
        }));
        const question = await db.question.upsert({
          where: { slug: fields.slug, createdById: activeUserId },
          update: {},
          create: { ...fields, createdById: activeUserId, tags: [...tags], testCases: { create: testCases } },
          select: { id: true, testCases: true }
        });

        const attempts = activeUsers.flatMap((user, userIndex) => {
          const questionCount = userIndex === 0 ? practiceQuestions.length : 6 + (userIndex - 1) % 5;
          const practiceIndex = (questionIndex + userIndex) % practiceQuestions.length;
          if (practiceIndex >= questionCount) return [];

          return Array.from({ length: 4 }, (_, attemptIndex) => {
            const sequence = userIndex + practiceIndex + attemptIndex;
            const isLastAttempt = attemptIndex === 3;
            const failure = failedAttempts[sequence % failedAttempts.length]!;
            const status = isLastAttempt
              ? (userIndex + practiceIndex) % 5 === 0 ? SubmissionStatus.PENDING : SubmissionStatus.ACCEPTED
              : failure.status;
            const daysAgo = (questionCount - practiceIndex - 1) * 7 + (3 - attemptIndex);
            const createdAt = new Date(Math.max(user.createdAt.getTime(), seededAt.getTime() - daysAgo * dayMs));
            const runtimeMs = status === SubmissionStatus.ACCEPTED ? 8 + sequence
              : status === SubmissionStatus.TIME_LIMIT_EXCEEDED ? 2000
              : null;
            const memoryKb = status === SubmissionStatus.ACCEPTED ? 2048 + 128 * sequence : null;

            return {
              submission: {
                id: `${user.id}-${fields.slug}-${attemptIndex + 1}`,
                userId: user.id,
                questionId: question.id,
                sourceCode: isLastAttempt ? solution : failure.sourceCode,
                status,
                runtimeMs,
                memoryKb,
                createdAt
              },
              actualOutput: failure.actualOutput
            };
          });
        });

        const inserted = await db.submission.createManyAndReturn({
          data: attempts.map(({ submission }) => submission),
          skipDuplicates: true,
          select: { id: true }
        });
        const insertedIds = new Set(inserted.map(({ id }) => id));
        const resultRows = attempts.flatMap(({ submission, actualOutput }) => {
          if (!insertedIds.has(submission.id) || submission.status === SubmissionStatus.PENDING) return [];

          return testCases.map((testCase) => {
            const stored = question.testCases.find((row) =>
              row.position === testCase.position && row.stdin === testCase.stdin &&
              row.expectedOutput === testCase.expectedOutput && row.isSample === testCase.isSample
            );
            return {
              ...testCase,
              testCaseId: stored?.id,
              submissionId: submission.id,
              status: submission.status,
              runtimeMs: submission.runtimeMs,
              memoryKb: submission.memoryKb,
              actualOutput: submission.status === SubmissionStatus.ACCEPTED ? testCase.expectedOutput : actualOutput
            };
          });
        });
        if (resultRows.length) await db.submissionCaseResult.createMany({ data: resultRows });
      }
    }, { timeout: 30_000 });
    console.log("AlgoArena fixtures ready: 12 accounts, 12 questions, and 381 submissions.");
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
