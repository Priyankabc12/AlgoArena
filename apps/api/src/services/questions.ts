import { prisma } from "../prisma.js";
import type {
  Difficulty,
  QuestionInput,
  QuestionListQuery
} from "../validation/questions.js";

export class SlugConflictError extends Error {
  constructor(message = "A question with this slug already exists.") {
    super(message);
    this.name = "SlugConflictError";
  }
}

export class QuestionNotFoundError extends Error {
  constructor(message = "Question not found.") {
    super(message);
    this.name = "QuestionNotFoundError";
  }
}

export type QuestionListItemDTO = {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
};

export type QuestionListResponseDTO = {
  items: QuestionListItemDTO[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicQuestionDetailDTO = {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  sampleTestCases: {
    position: number;
    stdin: string;
    expectedOutput: string;
  }[];
};

export type AdminTestCaseDTO = {
  id: number;
  position: number;
  stdin: string;
  expectedOutput: string;
  isSample: boolean;
};

export type AdminQuestionDetailDTO = {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  testCases: AdminTestCaseDTO[];
  createdAt: string;
  updatedAt: string;
};

function mapToListItemDTO(question: {
  id: number;
  slug: string;
  title: string;
  difficulty: string;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
}): QuestionListItemDTO {
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    difficulty: question.difficulty as Difficulty,
    tags: question.tags,
    timeLimit: question.timeLimit,
    memoryLimit: question.memoryLimit
  };
}

function mapToPublicDetailDTO(question: {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: string;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  testCases: {
    position: number;
    stdin: string;
    expectedOutput: string;
  }[];
}): PublicQuestionDetailDTO {
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    statement: question.statement,
    difficulty: question.difficulty as Difficulty,
    tags: question.tags,
    timeLimit: question.timeLimit,
    memoryLimit: question.memoryLimit,
    sampleTestCases: question.testCases.map((tc) => ({
      position: tc.position,
      stdin: tc.stdin,
      expectedOutput: tc.expectedOutput
    }))
  };
}

function mapToAdminDetailDTO(question: {
  id: number;
  slug: string;
  title: string;
  statement: string;
  difficulty: string;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  createdAt: Date;
  updatedAt: Date;
  testCases: {
    id: number;
    position: number;
    stdin: string;
    expectedOutput: string;
    isSample: boolean;
  }[];
}): AdminQuestionDetailDTO {
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    statement: question.statement,
    difficulty: question.difficulty as Difficulty,
    tags: question.tags,
    timeLimit: question.timeLimit,
    memoryLimit: question.memoryLimit,
    testCases: question.testCases.map((tc) => ({
      id: tc.id,
      position: tc.position,
      stdin: tc.stdin,
      expectedOutput: tc.expectedOutput,
      isSample: tc.isSample
    })),
    createdAt: question.createdAt.toISOString(),
    updatedAt: question.updatedAt.toISOString()
  };
}

export async function listQuestions(
  query: QuestionListQuery
): Promise<QuestionListResponseDTO> {
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { slug: { contains: query.search, mode: "insensitive" } }
    ];
  }

  if (query.difficulty) {
    where.difficulty = query.difficulty;
  }

  if (query.tag) {
    where.tags = { has: query.tag };
  }

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: true,
        timeLimit: true,
        memoryLimit: true
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit
    })
  ]);

  const totalPages = Math.ceil(total / query.limit);

  return {
    items: items.map(mapToListItemDTO),
    page: query.page,
    limit: query.limit,
    total,
    totalPages
  };
}

export async function getPublicQuestionBySlug(
  slug: string
): Promise<PublicQuestionDetailDTO | null> {
  const question = await prisma.question.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      statement: true,
      difficulty: true,
      tags: true,
      timeLimit: true,
      memoryLimit: true,
      testCases: {
        where: { isSample: true },
        orderBy: { position: "asc" },
        select: {
          position: true,
          stdin: true,
          expectedOutput: true
        }
      }
    }
  });

  if (!question) {
    return null;
  }

  return mapToPublicDetailDTO(question);
}

export async function getAdminQuestionBySlug(
  slug: string
): Promise<AdminQuestionDetailDTO | null> {
  const question = await prisma.question.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      statement: true,
      difficulty: true,
      tags: true,
      timeLimit: true,
      memoryLimit: true,
      createdAt: true,
      updatedAt: true,
      testCases: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          stdin: true,
          expectedOutput: true,
          isSample: true
        }
      }
    }
  });

  if (!question) {
    return null;
  }

  return mapToAdminDetailDTO(question);
}

export async function createQuestion(
  data: QuestionInput,
  createdById: string
): Promise<AdminQuestionDetailDTO> {
  const existing = await prisma.question.findUnique({
    where: { slug: data.slug }
  });

  if (existing) {
    throw new SlugConflictError("A question with this slug already exists.");
  }

  try {
    const created = await prisma.question.create({
      data: {
        slug: data.slug,
        title: data.title,
        statement: data.statement,
        difficulty: data.difficulty,
        tags: data.tags,
        timeLimit: data.timeLimit,
        memoryLimit: data.memoryLimit,
        createdById,
        testCases: {
          create: data.testCases.map((tc, index) => ({
            position: index,
            stdin: tc.stdin ?? "",
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample
          }))
        }
      },
      select: {
        id: true,
        slug: true,
        title: true,
        statement: true,
        difficulty: true,
        tags: true,
        timeLimit: true,
        memoryLimit: true,
        createdAt: true,
        updatedAt: true,
        testCases: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            position: true,
            stdin: true,
            expectedOutput: true,
            isSample: true
          }
        }
      }
    });

    return mapToAdminDetailDTO(created);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new SlugConflictError("A question with this slug already exists.");
    }
    throw error;
  }
}

export async function updateQuestion(
  originalSlug: string,
  data: QuestionInput
): Promise<AdminQuestionDetailDTO> {
  const existing = await prisma.question.findUnique({
    where: { slug: originalSlug }
  });

  if (!existing) {
    throw new QuestionNotFoundError("Question not found.");
  }

  if (data.slug !== originalSlug) {
    const conflicting = await prisma.question.findUnique({
      where: { slug: data.slug }
    });
    if (conflicting && conflicting.id !== existing.id) {
      throw new SlugConflictError("A question with this slug already exists.");
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.testCase.deleteMany({
        where: { questionId: existing.id }
      });

      return tx.question.update({
        where: { id: existing.id },
        data: {
          slug: data.slug,
          title: data.title,
          statement: data.statement,
          difficulty: data.difficulty,
          tags: data.tags,
          timeLimit: data.timeLimit,
          memoryLimit: data.memoryLimit,
          testCases: {
            create: data.testCases.map((tc, index) => ({
              position: index,
              stdin: tc.stdin ?? "",
              expectedOutput: tc.expectedOutput,
              isSample: tc.isSample
            }))
          }
        },
        select: {
          id: true,
          slug: true,
          title: true,
          statement: true,
          difficulty: true,
          tags: true,
          timeLimit: true,
          memoryLimit: true,
          createdAt: true,
          updatedAt: true,
          testCases: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              stdin: true,
              expectedOutput: true,
              isSample: true
            }
          }
        }
      });
    });

    return mapToAdminDetailDTO(updated);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new SlugConflictError("A question with this slug already exists.");
    }
    throw error;
  }
}
