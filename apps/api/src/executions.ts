import { fromNodeHeaders } from "better-auth/node";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { auth } from "./auth.js";
import { SubmissionStatus } from "./generated/prisma/client.js";
import {
  executeWithJudge0,
  Judge0UnavailableError,
  type CaseExecutionResult,
  type Judge0Input
} from "./judge0.js";
import { prisma } from "./prisma.js";

const executionSchema = z.object({
  questionSlug: z.string().trim().min(1).max(200),
  sourceCode: z.string().min(1).max(100_000)
}).strict();

const historyQuerySchema = z.object({
  questionSlug: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
}).strict();

const submissionIdSchema = z.string().trim().min(1).max(100);

type ExecuteCase = (input: Judge0Input) => Promise<CaseExecutionResult>;

type TestCaseRecord = {
  id: number;
  position: number;
  stdin: string;
  expectedOutput: string;
  isSample: boolean;
};

type ExecutedCase = TestCaseRecord & CaseExecutionResult;

const statusPriority: Record<SubmissionStatus, number> = {
  INTERNAL_ERROR: 7,
  COMPILATION_ERROR: 6,
  RUNTIME_ERROR: 5,
  MEMORY_LIMIT_EXCEEDED: 4,
  TIME_LIMIT_EXCEEDED: 3,
  WRONG_ANSWER: 2,
  ACCEPTED: 1,
  PENDING: 0
};

async function authenticatedUserId(request: Request, response: Response): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });

    if (!session) {
      response.status(401).json({ error: "Sign in to continue." });
      return null;
    }

    return session.user.id;
  } catch {
    response.status(500).json({ error: "Authentication is unavailable." });
    return null;
  }
}

async function executeCases(
  sourceCode: string,
  testCases: TestCaseRecord[],
  timeLimit: number,
  memoryLimit: number,
  executeCase: ExecuteCase
): Promise<ExecutedCase[]> {
  const results: ExecutedCase[] = [];

  for (const testCase of testCases) {
    const result = await executeCase({
      sourceCode,
      stdin: testCase.stdin,
      expectedOutput: testCase.expectedOutput,
      timeLimit,
      memoryLimit
    });
    results.push({ ...testCase, ...result });
  }

  return results;
}

function summarize(results: ExecutedCase[]) {
  const status = results.reduce<SubmissionStatus>(
    (current, result) => statusPriority[result.status] > statusPriority[current] ? result.status : current,
    SubmissionStatus.ACCEPTED
  );
  const runtimes = results.flatMap((result) => result.runtimeMs === null ? [] : [result.runtimeMs]);
  const memories = results.flatMap((result) => result.memoryKb === null ? [] : [result.memoryKb]);

  return {
    status,
    passed: results.filter((result) => result.status === SubmissionStatus.ACCEPTED).length,
    runtimeMs: runtimes.length ? Math.max(...runtimes) : null,
    memoryKb: memories.length ? Math.max(...memories) : null
  };
}

function safeCaseResult(result: ExecutedCase) {
  const common = {
    position: result.position,
    isSample: result.isSample,
    status: result.status,
    runtimeMs: result.runtimeMs,
    memoryKb: result.memoryKb
  };

  return result.isSample ? {
    ...common,
    stdin: result.stdin,
    expectedOutput: result.expectedOutput,
    actualOutput: result.actualOutput
  } : common;
}

export function createExecutionsRouter(executeCase: ExecuteCase = executeWithJudge0) {
  const router = Router();

  router.post("/executions/run", async (request, response) => {
    const userId = await authenticatedUserId(request, response);
    if (!userId) return;

    const parsed = executionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "questionSlug and sourceCode are required." });
      return;
    }

    try {
      const question = await prisma.question.findUnique({
        where: { slug: parsed.data.questionSlug },
        include: { testCases: { where: { isSample: true }, orderBy: { position: "asc" } } }
      });

      if (!question) {
        response.status(404).json({ error: "Question not found." });
        return;
      }
      if (!question.testCases.length) {
        response.status(422).json({ error: "This question has no sample test cases." });
        return;
      }

      const results = await executeCases(
        parsed.data.sourceCode,
        question.testCases,
        question.timeLimit,
        question.memoryLimit,
        executeCase
      );
      const summary = summarize(results);
      response.json({
        mode: "run",
        ...summary,
        total: results.length,
        results: results.map(safeCaseResult)
      });
    } catch (error) {
      response.status(error instanceof Judge0UnavailableError ? 502 : 500).json({
        error: error instanceof Judge0UnavailableError ? "Judge0 is unavailable." : "Could not run code."
      });
    }
  });

  router.post("/executions/submit", async (request, response) => {
    const userId = await authenticatedUserId(request, response);
    if (!userId) return;

    const parsed = executionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "questionSlug and sourceCode are required." });
      return;
    }

    let question;

    try {
      question = await prisma.question.findUnique({
        where: { slug: parsed.data.questionSlug },
        include: { testCases: { orderBy: { position: "asc" } } }
      });
    } catch {
      response.status(500).json({ error: "Could not load question." });
      return;
    }

    if (!question) {
      response.status(404).json({ error: "Question not found." });
      return;
    }
    if (!question.testCases.length) {
      response.status(422).json({ error: "This question has no test cases." });
      return;
    }

    let submissionId: string | undefined;

    try {
      const submission = await prisma.submission.create({
        data: {
          userId,
          questionId: question.id,
          sourceCode: parsed.data.sourceCode
        }
      });
      submissionId = submission.id;

      const results = await executeCases(
        parsed.data.sourceCode,
        question.testCases,
        question.timeLimit,
        question.memoryLimit,
        executeCase
      );
      const summary = summarize(results);
      const saved = await prisma.submission.update({
        where: { id: submission.id },
        data: {
          status: summary.status,
          runtimeMs: summary.runtimeMs,
          memoryKb: summary.memoryKb,
          caseResults: {
            create: results.map((result) => ({
              testCaseId: result.id,
              position: result.position,
              isSample: result.isSample,
              stdin: result.isSample ? result.stdin : null,
              expectedOutput: result.isSample ? result.expectedOutput : null,
              status: result.status,
              runtimeMs: result.runtimeMs,
              memoryKb: result.memoryKb,
              actualOutput: result.actualOutput
            }))
          }
        }
      });

      response.status(201).json({
        mode: "submit",
        submissionId: saved.id,
        ...summary,
        total: results.length,
        results: results.map(safeCaseResult),
        createdAt: saved.createdAt
      });
    } catch (error) {
      if (submissionId) {
        await prisma.submission.update({
          where: { id: submissionId },
          data: { status: SubmissionStatus.INTERNAL_ERROR }
        }).catch(() => undefined);
      }

      response.status(error instanceof Judge0UnavailableError ? 502 : 500).json({
        error: error instanceof Judge0UnavailableError ? "Judge0 is unavailable." : "Could not submit code.",
        ...(submissionId ? { submissionId } : {})
      });
    }
  });

  router.get("/submissions", async (request, response) => {
    const userId = await authenticatedUserId(request, response);
    if (!userId) return;

    const parsed = historyQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      response.status(400).json({ error: "Invalid submission history query." });
      return;
    }

    const { questionSlug, page, limit } = parsed.data;
    const where = {
      userId,
      ...(questionSlug ? { question: { slug: questionSlug } } : {})
    };

    try {
      const [items, total] = await Promise.all([
        prisma.submission.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
          include: { question: { select: { slug: true, title: true } } }
        }),
        prisma.submission.count({ where })
      ]);

      response.json({
        items: items.map(({ sourceCode: _sourceCode, questionId: _questionId, userId: _userId, ...item }) => item),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      });
    } catch {
      response.status(500).json({ error: "Could not load submissions." });
    }
  });

  router.get("/submissions/:id", async (request, response) => {
    const userId = await authenticatedUserId(request, response);
    if (!userId) return;

    const parsedId = submissionIdSchema.safeParse(request.params.id);
    if (!parsedId.success) {
      response.status(404).json({ error: "Submission not found." });
      return;
    }

    try {
      const submission = await prisma.submission.findFirst({
        where: { id: parsedId.data, userId },
        include: {
          question: { select: { slug: true, title: true } },
          caseResults: {
            orderBy: { position: "asc" }
          }
        }
      });

      if (!submission) {
        response.status(404).json({ error: "Submission not found." });
        return;
      }

      const { questionId: _questionId, userId: _userId, caseResults, ...safeSubmission } = submission;
      response.json({
        ...safeSubmission,
        results: caseResults.map((result) => safeCaseResult({
          id: result.testCaseId ?? 0,
          position: result.position,
          stdin: result.stdin ?? "",
          expectedOutput: result.expectedOutput ?? "",
          isSample: result.isSample,
          status: result.status,
          runtimeMs: result.runtimeMs,
          memoryKb: result.memoryKb,
          actualOutput: result.actualOutput ?? ""
        }))
      });
    } catch {
      response.status(500).json({ error: "Could not load submission." });
    }
  });

  return router;
}

export const executionsRouter = createExecutionsRouter();
