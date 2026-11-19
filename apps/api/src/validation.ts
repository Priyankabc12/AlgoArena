import { z } from "zod";

export const legacyExecutionSchema = z.object({
  source_code: z.string(),
  language_id: z.number().int().positive(),
  stdin: z.string().optional()
}).strict();

const testCaseSchema = z.object({
  stdin: z.string().optional(),
  expectedOutput: z.string(),
  isSample: z.boolean().optional()
}).strict();

export const questionInputSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1),
  statement: z.string().trim().min(1),
  timeLimit: z.number().finite().positive().optional(),
  memoryLimit: z.number().int().positive().optional(),
  testCases: z.array(testCaseSchema).min(1)
}).strict();
