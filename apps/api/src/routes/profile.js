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

// Add the stats, paginated history, and display-name update routes here.