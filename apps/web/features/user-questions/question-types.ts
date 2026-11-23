export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionItem = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
};

export type QuestionList = { items: QuestionItem[]; total: number; page: number; totalPages: number };

export type QuestionDetail = QuestionItem & {
  statement: string;
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

export type SubmissionSummary = {
  id: string;
  language: string;
  status: CaseResult["status"];
  createdAt: string;
  runtimeMs: number | null;
  memoryKb: number | null;
  question: { title: string; slug: string };
};

export function statusLabel(status: CaseResult["status"]) {
  return {
    ACCEPTED: "Accepted",
    WRONG_ANSWER: "Wrong answer",
    TIME_LIMIT_EXCEEDED: "Time limit exceeded",
    MEMORY_LIMIT_EXCEEDED: "Memory limit exceeded",
    COMPILATION_ERROR: "Compilation error",
    RUNTIME_ERROR: "Runtime error",
    INTERNAL_ERROR: "Internal error",
    PENDING: "Pending"
  }[status];
}
