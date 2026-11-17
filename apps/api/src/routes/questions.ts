import { fromNodeHeaders } from "better-auth/node";
import express, { type NextFunction, type Request, type Response, Router } from "express";
import { auth } from "../auth.js";
import {
  createQuestion,
  getAdminQuestionBySlug,
  getPublicQuestionBySlug,
  listQuestions,
  QuestionNotFoundError,
  SlugConflictError,
  updateQuestion
} from "../services/questions.js";
import {
  validateQuestionInput,
  validateQuestionListQuery
} from "../validation/questions.js";

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    role: string;
    [key: string]: unknown;
  };
};

async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  let session;

  try {
    session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });
  } catch {
    res.status(500).json({ error: "Authentication is unavailable." });
    return;
  }

  if (!session) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }

  if (session.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  (req as AuthenticatedRequest).user = session.user;
  next();
}

function getSlugParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
}

export const questionsRouter = Router();
questionsRouter.use(express.json());

// Public: GET /questions
questionsRouter.get("/questions", async (req: Request, res: Response) => {
  const validation = validateQuestionListQuery(req.query as Record<string, unknown>);

  if (!validation.valid) {
    res.status(400).json({
      error: validation.error,
      fields: validation.fields
    });
    return;
  }

  try {
    const result = await listQuestions(validation.data);
    res.json(result);
  } catch {
    res.status(500).json({ error: "Failed to list questions." });
  }
});

// Public: GET /questions/:slug
questionsRouter.get("/questions/:slug", async (req: Request, res: Response) => {
  const slug = getSlugParam(req.params.slug);
  try {
    const question = await getPublicQuestionBySlug(slug);
    if (!question) {
      res.status(404).json({ error: "Question not found." });
      return;
    }
    res.json(question);
  } catch {
    res.status(500).json({ error: "Failed to get question." });
  }
});

// Admin: GET /admin/questions/:slug
questionsRouter.get(
  "/admin/questions/:slug",
  requireAdmin,
  async (req: Request, res: Response) => {
    const slug = getSlugParam(req.params.slug);
    try {
      const question = await getAdminQuestionBySlug(slug);
      if (!question) {
        res.status(404).json({ error: "Question not found." });
        return;
      }
      res.json(question);
    } catch {
      res.status(500).json({ error: "Failed to get question." });
    }
  }
);

// Admin: POST /admin/questions
questionsRouter.post(
  "/admin/questions",
  requireAdmin,
  async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const validation = validateQuestionInput(req.body);

    if (!validation.valid) {
      res.status(400).json({
        error: validation.error,
        fields: validation.fields
      });
      return;
    }

    try {
      const created = await createQuestion(validation.data, authReq.user.id);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof SlugConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Failed to create question." });
    }
  }
);

// Admin: PATCH /admin/questions/:slug
questionsRouter.patch(
  "/admin/questions/:slug",
  requireAdmin,
  async (req: Request, res: Response) => {
    const originalSlug = getSlugParam(req.params.slug);

    // Check if original question exists before validating body / modifying
    try {
      const existing = await getAdminQuestionBySlug(originalSlug);
      if (!existing) {
        res.status(404).json({ error: "Question not found." });
        return;
      }
    } catch {
      res.status(500).json({ error: "Failed to find question." });
      return;
    }

    const validation = validateQuestionInput(req.body);

    if (!validation.valid) {
      res.status(400).json({
        error: validation.error,
        fields: validation.fields
      });
      return;
    }

    try {
      const updated = await updateQuestion(originalSlug, validation.data);
      res.status(200).json(updated);
    } catch (error) {
      if (error instanceof QuestionNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error instanceof SlugConflictError) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Failed to update question." });
    }
  }
);
