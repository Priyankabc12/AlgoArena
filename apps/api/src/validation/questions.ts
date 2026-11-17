export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type TestCaseInput = {
  stdin?: string;
  expectedOutput: string;
  isSample: boolean;
};

export type QuestionInput = {
  slug: string;
  title: string;
  statement: string;
  difficulty: Difficulty;
  tags: string[];
  timeLimit: number;
  memoryLimit: number;
  testCases: TestCaseInput[];
};

export type QuestionListQuery = {
  search?: string;
  difficulty?: Difficulty;
  tag?: string;
  page: number;
  limit: number;
};

export type ValidationSuccess<T> = {
  valid: true;
  data: T;
};

export type ValidationFailure = {
  valid: false;
  error: string;
  fields: Record<string, string>;
};

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateQuestionInput(body: unknown): ValidationResult<QuestionInput> {
  const fields: Record<string, string> = {};

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      valid: false,
      error: "Request body must be a JSON object.",
      fields: { body: "Request body must be a JSON object." }
    };
  }

  const record = body as Record<string, unknown>;

  // Slug
  if (typeof record.slug !== "string" || !SLUG_REGEX.test(record.slug)) {
    fields.slug = "Slug must contain lowercase letters, numbers, and hyphens only.";
  }

  // Title
  if (typeof record.title !== "string" || record.title.trim().length === 0) {
    fields.title = "Title cannot be empty.";
  }

  // Statement
  if (typeof record.statement !== "string" || record.statement.trim().length === 0) {
    fields.statement = "Statement cannot be empty.";
  }

  // Difficulty
  if (
    typeof record.difficulty !== "string" ||
    (record.difficulty !== "EASY" && record.difficulty !== "MEDIUM" && record.difficulty !== "HARD")
  ) {
    fields.difficulty = "Difficulty must be EASY, MEDIUM, or HARD.";
  }

  // Tags
  let trimmedTags: string[] = [];
  if (!Array.isArray(record.tags)) {
    fields.tags = "Tags must be an array of strings.";
  } else {
    const seen = new Set<string>();
    let validTags = true;
    for (const tag of record.tags) {
      if (typeof tag !== "string" || tag.trim().length === 0) {
        validTags = false;
        fields.tags = "Tags must be trimmed, non-empty, case-insensitively unique strings.";
        break;
      }
      const trimmed = tag.trim();
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) {
        validTags = false;
        fields.tags = "Tags must be trimmed, non-empty, case-insensitively unique strings.";
        break;
      }
      seen.add(lower);
      trimmedTags.push(trimmed);
    }
  }

  // Time Limit
  if (
    typeof record.timeLimit !== "number" ||
    !Number.isFinite(record.timeLimit) ||
    record.timeLimit <= 0
  ) {
    fields.timeLimit = "Time limit must be finite and greater than zero.";
  }

  // Memory Limit
  if (
    typeof record.memoryLimit !== "number" ||
    !Number.isInteger(record.memoryLimit) ||
    record.memoryLimit <= 0
  ) {
    fields.memoryLimit = "Memory limit must be a positive integer.";
  }

  // Test Cases
  let validatedTestCases: TestCaseInput[] = [];
  if (!Array.isArray(record.testCases) || record.testCases.length === 0) {
    fields.testCases = "At least one sample and one hidden test case are required.";
  } else {
    let hasSample = false;
    let hasHidden = false;
    let validTestCases = true;

    for (const tc of record.testCases) {
      if (typeof tc !== "object" || tc === null || Array.isArray(tc)) {
        validTestCases = false;
        break;
      }
      const testCaseRecord = tc as Record<string, unknown>;

      if (
        testCaseRecord.stdin !== undefined &&
        typeof testCaseRecord.stdin !== "string"
      ) {
        validTestCases = false;
        break;
      }

      if (typeof testCaseRecord.expectedOutput !== "string") {
        validTestCases = false;
        break;
      }

      if (typeof testCaseRecord.isSample !== "boolean") {
        validTestCases = false;
        break;
      }

      if (testCaseRecord.isSample) {
        hasSample = true;
      } else {
        hasHidden = true;
      }

      validatedTestCases.push({
        stdin: typeof testCaseRecord.stdin === "string" ? testCaseRecord.stdin : "",
        expectedOutput: testCaseRecord.expectedOutput,
        isSample: testCaseRecord.isSample
      });
    }

    if (!validTestCases || !hasSample || !hasHidden) {
      fields.testCases = "At least one sample and one hidden test case are required.";
    }
  }

  if (Object.keys(fields).length > 0) {
    return {
      valid: false,
      error: "Validation failed.",
      fields
    };
  }

  return {
    valid: true,
    data: {
      slug: record.slug as string,
      title: (record.title as string).trim(),
      statement: (record.statement as string).trim(),
      difficulty: record.difficulty as Difficulty,
      tags: trimmedTags,
      timeLimit: record.timeLimit as number,
      memoryLimit: record.memoryLimit as number,
      testCases: validatedTestCases
    }
  };
}

export function validateQuestionListQuery(
  query: Record<string, unknown>
): ValidationResult<QuestionListQuery> {
  const fields: Record<string, string> = {};

  let page = 1;
  if (query.page !== undefined && query.page !== "") {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      fields.page = "Page must be a positive integer.";
    } else {
      page = parsedPage;
    }
  }

  let limit = 20;
  if (query.limit !== undefined && query.limit !== "") {
    const parsedLimit = Number(query.limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      fields.limit = "Limit must be an integer from 1 through 100.";
    } else {
      limit = parsedLimit;
    }
  }

  let difficulty: Difficulty | undefined;
  if (query.difficulty !== undefined && query.difficulty !== "") {
    if (
      typeof query.difficulty !== "string" ||
      (query.difficulty !== "EASY" && query.difficulty !== "MEDIUM" && query.difficulty !== "HARD")
    ) {
      fields.difficulty = "Difficulty must be EASY, MEDIUM, or HARD.";
    } else {
      difficulty = query.difficulty;
    }
  }

  let tag: string | undefined;
  if (query.tag !== undefined && query.tag !== "") {
    if (typeof query.tag !== "string") {
      fields.tag = "Tag must be a string.";
    } else {
      tag = query.tag.trim();
    }
  }

  let search: string | undefined;
  if (query.search !== undefined && query.search !== "") {
    if (typeof query.search !== "string") {
      fields.search = "Search must be a string.";
    } else {
      search = query.search.trim();
    }
  }

  if (Object.keys(fields).length > 0) {
    return {
      valid: false,
      error: "Invalid query parameters.",
      fields
    };
  }

  return {
    valid: true,
    data: {
      page,
      limit,
      difficulty,
      tag,
      search
    }
  };
}
