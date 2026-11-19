-- DropForeignKey
ALTER TABLE "submission_case_results" DROP CONSTRAINT "submission_case_results_test_case_id_fkey";

-- DropIndex
DROP INDEX "submission_case_results_submission_id_test_case_id_key";

-- AlterTable
ALTER TABLE "submission_case_results"
ADD COLUMN "expected_output" TEXT,
ADD COLUMN "is_sample" BOOLEAN NOT NULL,
ADD COLUMN "position" INTEGER NOT NULL,
ADD COLUMN "stdin" TEXT,
ALTER COLUMN "test_case_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "submission_case_results_submission_id_position_key" ON "submission_case_results"("submission_id", "position");

-- AddForeignKey
ALTER TABLE "submission_case_results" ADD CONSTRAINT "submission_case_results_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
