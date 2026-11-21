-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'EASY',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
