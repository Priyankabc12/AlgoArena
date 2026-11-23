export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionDetail = {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  sampleTestCases: { position: number; stdin: string; expectedOutput: string }[];
};

export type CaseResult = {
  position: number;
  isSample: boolean;
  status: "PENDING" | "ACCEPTED" | "WRONG_ANSWER" | "TIME_LIMIT_EXCEEDED" | "MEMORY_LIMIT_EXCEEDED" | "COMPILATION_ERROR" | "RUNTIME_ERROR" | "INTERNAL_ERROR";
  runtimeMs: number | null;
  memoryKb: number | null;
  stdin?: string;
  expectedOutput?: string;
  actualOutput?: string;
};

export type ExecutionResponse = {
  mode: "run" | "submit";
  status: CaseResult["status"];
  passed: number;
  total: number;
  runtimeMs: number | null;
  memoryKb: number | null;
  results: CaseResult[];
  submissionId?: string;
};
