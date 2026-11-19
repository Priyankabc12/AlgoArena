import { SubmissionStatus } from "./generated/prisma/client.js";

export type Judge0Input = {
  sourceCode: string;
  stdin: string;
  expectedOutput: string;
  timeLimit: number;
  memoryLimit: number;
};

export type CaseExecutionResult = {
  status: SubmissionStatus;
  runtimeMs: number | null;
  memoryKb: number | null;
  actualOutput: string;
};

type Judge0Response = {
  stdout?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: { id?: number; description?: string };
};

export class Judge0UnavailableError extends Error {}

function normalizeStatus(status: Judge0Response["status"]): SubmissionStatus {
  const description = status?.description?.toLowerCase() ?? "";

  if (description.includes("memory limit")) return SubmissionStatus.MEMORY_LIMIT_EXCEEDED;
  if (status?.id === 3) return SubmissionStatus.ACCEPTED;
  if (status?.id === 4) return SubmissionStatus.WRONG_ANSWER;
  if (status?.id === 5) return SubmissionStatus.TIME_LIMIT_EXCEEDED;
  if (status?.id === 6) return SubmissionStatus.COMPILATION_ERROR;
  if (status?.id && status.id >= 7 && status.id <= 12) return SubmissionStatus.RUNTIME_ERROR;
  return SubmissionStatus.INTERNAL_ERROR;
}

export async function executeWithJudge0(input: Judge0Input): Promise<CaseExecutionResult> {
  const judge0Url = process.env.JUDGE0_URL ?? "http://localhost:2358";

  try {
    const response = await fetch(`${judge0Url}/submissions?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(Math.max(10_000, (input.timeLimit + 5) * 1_000)),
      body: JSON.stringify({
        source_code: input.sourceCode,
        language_id: 71,
        stdin: input.stdin,
        expected_output: input.expectedOutput,
        cpu_time_limit: input.timeLimit,
        memory_limit: input.memoryLimit
      })
    });

    if (!response.ok) throw new Error("Judge0 rejected the submission.");
    const result = await response.json() as Judge0Response;
    const seconds = result.time === null || result.time === undefined ? Number.NaN : Number(result.time);

    return {
      status: normalizeStatus(result.status),
      runtimeMs: Number.isFinite(seconds) ? seconds * 1_000 : null,
      memoryKb: typeof result.memory === "number" ? Math.round(result.memory) : null,
      actualOutput: result.stdout ?? ""
    };
  } catch (error) {
    if (error instanceof Judge0UnavailableError) throw error;
    throw new Judge0UnavailableError("Judge0 is unavailable.");
  }
}
