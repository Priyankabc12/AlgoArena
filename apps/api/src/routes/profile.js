import "dotenv/config";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { auth } from "../auth.js";
import { prisma } from "../prisma.js";

export const profileRouter = Router();

profileRouter.use(async (request, response, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers)
    });

    if (!session) {
      response.status(401).json({ error: "Sign in to view your profile." });
      return;
    }

    // Store the authenticated user ID for the route handlers.
    response.locals.userId = session.user.id;
    next();
  } catch {
    response.status(500).json({ error: "Could not load your profile." });
  }
});

profileRouter.get("/profile", async (_request, response) => {
  response.setHeader("Cache-Control", "private, no-store");

  try {
    const user = await prisma.user.findUnique({
      where: { id: response.locals.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      response.status(404).json({ error: "Profile not found." });
      return;
    }

    response.json(user);
  } catch {
    response.status(500).json({ error: "Could not load your profile." });
  }
});

profileRouter.patch("/profile", async (request, response) => {
  response.setHeader("Cache-Control", "private, no-store");

  if (!request.is("application/json")) {
    response.status(400).json({ error: "Send the update as application/json." });
    return;
  }

  const trustedOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  if (request.get("Origin") !== trustedOrigin) {
    response.status(403).json({ error: "Requests must come from the trusted web origin." });
    return;
  }

  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, "name")) {
    response.status(400).json({ error: "Provide only a name field." });
    return;
  }

  if (typeof body.name !== "string") {
    response.status(400).json({ error: "Name must be a string between 1 and 50 characters." });
    return;
  }

  const name = body.name.trim();
  if (name.length < 1 || name.length > 50) {
    response.status(400).json({ error: "Name must be between 1 and 50 characters." });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id: response.locals.userId },
      data: { name },
      select: { name: true }
    });

    response.json(user);
  } catch {
    response.status(500).json({ error: "Could not update your profile." });
  }
});

profileRouter.get("/profile/stats", async (_request, response) => {
  response.setHeader("Cache-Control", "private, no-store");

  try {
    const userId = response.locals.userId;

    const [totalSubmissions, solvedQuestions] = await Promise.all([
      prisma.submission.count({ where: { userId } }),
      prisma.submission.findMany({
        where: { userId, status: "ACCEPTED" },
        distinct: ["questionId"],
        select: { questionId: true }
      })
    ]);

    response.json({
      totalSubmissions,
      solvedQuestions: solvedQuestions.length
    });
  } catch {
    response.status(500).json({ error: "Could not load profile stats." });
  }
});

profileRouter.get("/profile/submissions", async (request, response) => {
  response.setHeader("Cache-Control", "private, no-store");

  const rawPage = request.query.page ?? "1";
  const pageText = Array.isArray(rawPage) ? "" : String(rawPage);
  const page = Number(pageText);

  if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1) {
    response.status(400).json({ error: "page must be a positive integer." });
    return;
  }

  const pageSize = 20;

  try {
    const rows = await prisma.submission.findMany({
      where: { userId: response.locals.userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
      select: {
        id: true,
        language: true,
        status: true,
        createdAt: true,
        runtimeMs: true,
        memoryKb: true,
        question: {
          select: {
            title: true,
            slug: true
          }
        }
      }
    });

    response.json({
      page,
      pageSize,
      hasNextPage: rows.length > pageSize,
      submissions: rows.slice(0, pageSize)
    });
  } catch {
    response.status(500).json({ error: "Could not load submission history." });
  }
});
