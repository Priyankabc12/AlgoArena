-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'INTERNAL_ERROR');

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "source_code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "runtime_ms" DOUBLE PRECISION,
    "memory_kb" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_case_results" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "test_case_id" INTEGER NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "runtime_ms" DOUBLE PRECISION,
    "memory_kb" INTEGER,
    "actual_output" TEXT,

    CONSTRAINT "submission_case_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "submissions_user_id_question_id_created_at_idx" ON "submissions"("user_id", "question_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "submission_case_results_submission_id_test_case_id_key" ON "submission_case_results"("submission_id", "test_case_id");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_case_results" ADD CONSTRAINT "submission_case_results_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_case_results" ADD CONSTRAINT "submission_case_results_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
