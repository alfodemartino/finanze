-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ExpenseCategory" ADD VALUE 'SMOKING';
ALTER TYPE "ExpenseCategory" ADD VALUE 'CHILDREN';
ALTER TYPE "ExpenseCategory" ADD VALUE 'PERSONAL_CARE';
ALTER TYPE "ExpenseCategory" ADD VALUE 'TECHNOLOGY';
ALTER TYPE "ExpenseCategory" ADD VALUE 'CHARITY';

-- CreateTable
CREATE TABLE "CategoryKeyword" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" "ExpenseCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryKeyword_groupId_keyword_key" ON "CategoryKeyword"("groupId", "keyword");

-- AddForeignKey
ALTER TABLE "CategoryKeyword" ADD CONSTRAINT "CategoryKeyword_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
