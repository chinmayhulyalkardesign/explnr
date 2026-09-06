-- CreateEnum
CREATE TYPE "ExpenseType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "type" "ExpenseType" NOT NULL DEFAULT 'DEBIT';

-- CreateTable
CREATE TABLE "MonthlyUnbilled" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyUnbilled_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyUnbilled_month_key" ON "MonthlyUnbilled"("month");
