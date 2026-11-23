import { prisma } from "./prisma.js";

type SeedQuestion = {
  slug: string;
  title: string;
  statement: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  testCases: { stdin: string; expectedOutput: string; isSample: boolean }[];
};

const curatedQuestions: SeedQuestion[] = [
  {
    slug: "sum-of-two-numbers",
    title: "Sum of Two Numbers",
    statement: "Read two integers from standard input and print their sum.",
    difficulty: "EASY",
    tags: ["Math", "Input/Output"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "2 3\n", expectedOutput: "5\n", isSample: true },
      { stdin: "-4 9\n", expectedOutput: "5\n", isSample: true },
      { stdin: "0 0\n", expectedOutput: "0\n", isSample: false },
      { stdin: "100000 -5\n", expectedOutput: "99995\n", isSample: false }
    ]
  },
  {
    slug: "maximum-of-three",
    title: "Maximum of Three Numbers",
    statement: "Read three integers from standard input and print the largest.",
    difficulty: "EASY",
    tags: ["Math"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "4 8 1\n", expectedOutput: "8\n", isSample: true },
      { stdin: "-5 -2 -10\n", expectedOutput: "-2\n", isSample: true },
      { stdin: "7 7 3\n", expectedOutput: "7\n", isSample: false },
      { stdin: "0 -1 -2\n", expectedOutput: "0\n", isSample: false }
    ]
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    statement: "Given a string containing only the characters (), [], and {}, print true if every bracket is closed in the correct order; otherwise print false.",
    difficulty: "MEDIUM",
    tags: ["Stack", "Strings"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "()[]{}\n", expectedOutput: "true\n", isSample: true },
      { stdin: "([)]\n", expectedOutput: "false\n", isSample: true },
      { stdin: "{[]}\n", expectedOutput: "true\n", isSample: false },
      { stdin: "((\n", expectedOutput: "false\n", isSample: false }
    ]
  },
  {
    slug: "merge-intervals",
    title: "Merge Intervals",
    statement: "Read a JSON array of integer intervals from one line. Merge all overlapping intervals and print the resulting array as compact JSON.",
    difficulty: "MEDIUM",
    tags: ["Array", "Sorting"],
    timeLimit: 2,
    memoryLimit: 128000,
    testCases: [
      { stdin: "[[1,3],[2,6],[8,10]]\n", expectedOutput: "[[1,6],[8,10]]\n", isSample: true },
      { stdin: "[[1,4],[4,5]]\n", expectedOutput: "[[1,5]]\n", isSample: false },
      { stdin: "[[1,2],[3,4]]\n", expectedOutput: "[[1,2],[3,4]]\n", isSample: false }
    ]
  },
  {
    slug: "course-schedule",
    title: "Course Schedule",
    statement: "The first line contains n and m: the number of courses and prerequisite pairs. Each of the next m lines contains course and prerequisite. Print true if all courses can be completed, or false if there is a cycle.",
    difficulty: "HARD",
    tags: ["Graph", "DFS"],
    timeLimit: 3,
    memoryLimit: 256000,
    testCases: [
      { stdin: "2 1\n1 0\n", expectedOutput: "true\n", isSample: true },
      { stdin: "2 2\n1 0\n0 1\n", expectedOutput: "false\n", isSample: true },
      { stdin: "4 3\n1 0\n2 1\n3 2\n", expectedOutput: "true\n", isSample: false }
    ]
  },
  {
    slug: "n-queens",
    title: "N-Queens",
    statement: "Given n, print the number of distinct ways to place n queens on an n × n chessboard so that no two queens attack each other.",
    difficulty: "HARD",
    tags: ["Backtracking"],
    timeLimit: 3,
    memoryLimit: 256000,
    testCases: [
      { stdin: "4\n", expectedOutput: "2\n", isSample: true },
      { stdin: "1\n", expectedOutput: "1\n", isSample: false },
      { stdin: "5\n", expectedOutput: "10\n", isSample: false }
    ]
  }
];

async function main() {
  const owner = await prisma.user.upsert({
    where: { id: "algoarena-curated-questions" },
    update: {},
    create: {
      id: "algoarena-curated-questions",
      name: "AlgoArena Curated Questions",
      email: "curated-questions@algoarena.local",
      emailVerified: true
    }
  });

  let created = 0;
  for (const question of curatedQuestions) {
    const existing = await prisma.question.findUnique({ where: { slug: question.slug }, select: { id: true } });
    if (existing) continue;
    await prisma.question.create({
      data: {
        ...question,
        createdById: owner.id,
        testCases: { create: question.testCases.map((testCase, position) => ({ ...testCase, position })) }
      }
    });
    created += 1;
  }

  console.log(`Curated questions ready. Added ${created}; left existing questions unchanged.`);
}

main().finally(() => prisma.$disconnect());
