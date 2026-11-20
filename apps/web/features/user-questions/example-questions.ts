export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type SampleTestCase = {
  position: number;
  stdin: string;
  expectedOutput: string;
};

export type ExampleQuestion = {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  sampleTestCases: SampleTestCase[];
};

export const exampleQuestions: ExampleQuestion[] = [
  {
    id: 1,
    slug: "sum-of-two-numbers",
    title: "Sum of Two Numbers",
    statement:
      "Read two integers from standard input and print their sum.",
    difficulty: "EASY",
    tags: ["Math", "Input/Output"],
    timeLimit: 2,
    memoryLimit: 128000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "2 3\n",
        expectedOutput: "5\n",
      },
      {
        position: 1,
        stdin: "-4 9\n",
        expectedOutput: "5\n",
      },
    ],
  },
  {
    id: 2,
    slug: "maximum-of-three",
    title: "Maximum of Three Numbers",
    statement:
      "Read three integers and print the largest of them.",
    difficulty: "EASY",
    tags: ["Math"],
    timeLimit: 2,
    memoryLimit: 128000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "4 8 1\n",
        expectedOutput: "8\n",
      },
      {
        position: 1,
        stdin: "-5 -2 -10\n",
        expectedOutput: "-2\n",
      },
    ],
  },
  {
    id: 3,
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    statement:
      "Given a string containing only brackets, determine whether the parentheses are balanced.",
    difficulty: "MEDIUM",
    tags: ["Stack", "Strings"],
    timeLimit: 2,
    memoryLimit: 128000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "()[]{}\n",
        expectedOutput: "true\n",
      },
      {
        position: 1,
        stdin: "([)]\n",
        expectedOutput: "false\n",
      },
    ],
  },
  {
    id: 4,
    slug: "merge-intervals",
    title: "Merge Intervals",
    statement:
      "Merge all overlapping intervals and return the resulting list.",
    difficulty: "MEDIUM",
    tags: ["Array", "Sorting"],
    timeLimit: 2,
    memoryLimit: 128000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "[[1,3],[2,6],[8,10]]",
        expectedOutput: "[[1,6],[8,10]]",
      },
    ],
  },
  {
    id: 5,
    slug: "course-schedule",
    title: "Course Schedule",
    statement:
      "Determine whether all courses can be completed given prerequisite pairs.",
    difficulty: "HARD",
    tags: ["Graph", "DFS"],
    timeLimit: 3,
    memoryLimit: 256000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "2\n[[1,0]]",
        expectedOutput: "true\n",
      },
    ],
  },
  {
    id: 6,
    slug: "n-queens",
    title: "N-Queens",
    statement:
      "Return every valid arrangement of N queens on an N × N chessboard.",
    difficulty: "HARD",
    tags: ["Backtracking"],
    timeLimit: 3,
    memoryLimit: 256000,
    sampleTestCases: [
      {
        position: 0,
        stdin: "4\n",
        expectedOutput:
          "[[\".Q..\",\"...Q\",\"Q...\",\"..Q.\"],[\"..Q.\",\"Q...\",\"...Q\",\".Q..\"]]\n",
      },
    ],
  },
];