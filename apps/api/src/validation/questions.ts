import { z } from "zod";

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"], {
  message: "Difficulty must be EASY, MEDIUM, or HARD."
});

export const questionTestCaseSchema = z.object({
  stdin: z.string().optional().default(""),
  expectedOutput: z.string({ message: "Expected output must be a string." }),
  isSample: z.boolean({ message: "isSample must be a boolean." })
});

export const tagsSchema = z
  .array(
    z.string().trim().min(1, "Tags must be trimmed, non-empty, case-insensitively unique strings."),
    { message: "Tags must be an array of strings." }
  )
  .superRefine((tags, ctx) => {
    const seen = new Set<string>();
    for (const tag of tags) {
      const lower = tag.trim().toLowerCase();
      if (seen.has(lower)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tags must be trimmed, non-empty, case-insensitively unique strings."
        });
        return;
      }
      seen.add(lower);
    }
  });

export const testCasesSchema = z
  .array(questionTestCaseSchema, {
    message: "At least one sample and one hidden test case are required."
  })
  .min(2, "At least one sample and one hidden test case are required.")
  .superRefine((testCases, ctx) => {
    const hasSample = testCases.some((tc) => tc.isSample === true);
    const hasHidden = testCases.some((tc) => tc.isSample === false);
    if (!hasSample || !hasHidden) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one sample and one hidden test case are required."
      });
    }
  });

export const questionInputSchema = z.object({
  slug: z
    .string({ message: "Slug must contain lowercase letters, numbers, and hyphens only." })
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only."
    ),
  title: z
    .string({ message: "Title cannot be empty." })
    .trim()
    .min(1, "Title cannot be empty."),
  statement: z
    .string({ message: "Statement cannot be empty." })
    .trim()
    .min(1, "Statement cannot be empty."),
  difficulty: difficultySchema,
  tags: tagsSchema,
  timeLimit: z
    .number({ message: "Time limit must be finite and greater than zero." })
    .finite("Time limit must be finite and greater than zero.")
    .positive("Time limit must be finite and greater than zero."),
  memoryLimit: z
    .number({ message: "Memory limit must be a positive integer." })
    .int("Memory limit must be a positive integer.")
    .positive("Memory limit must be a positive integer."),
  testCases: testCasesSchema
});

const emptyStringToUndefined = (val: unknown) => {
  if (typeof val === "string" && val.trim() === "") return undefined;
  if (val === undefined || val === null) return undefined;
  return val;
};

export const questionListQuerySchema = z.object({
  page: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z
      .number({ message: "Page must be a positive integer." })
      .int("Page must be a positive integer.")
      .positive("Page must be a positive integer.")
      .default(1)
  ),
  limit: z.preprocess(
    (val) => (val === "" || val === undefined ? undefined : Number(val)),
    z
      .number({ message: "Limit must be an integer from 1 through 100." })
      .int("Limit must be an integer from 1 through 100.")
      .min(1, "Limit must be an integer from 1 through 100.")
      .max(100, "Limit must be an integer from 1 through 100.")
      .default(20)
  ),
  difficulty: z.preprocess(
    emptyStringToUndefined,
    difficultySchema.optional()
  ),
  tag: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
  ),
  search: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().optional()
  )
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type TestCaseInput = z.infer<typeof questionTestCaseSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type QuestionListQuery = z.infer<typeof questionListQuerySchema>;

export function formatZodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "body";
    if (!fields[key]) {
      fields[key] = issue.message;
    }
  }
  return fields;
}

export function validateQuestionInput(body: unknown) {
  const result = questionInputSchema.safeParse(body);
  if (!result.success) {
    return {
      valid: false as const,
      error: "Validation failed.",
      fields: formatZodFields(result.error)
    };
  }
  return {
    valid: true as const,
    data: result.data
  };
}

export function validateQuestionListQuery(query: unknown) {
  const result = questionListQuerySchema.safeParse(query);
  if (!result.success) {
    return {
      valid: false as const,
      error: "Invalid query parameters.",
      fields: formatZodFields(result.error)
    };
  }
  return {
    valid: true as const,
    data: result.data
  };
}
