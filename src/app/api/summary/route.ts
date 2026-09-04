import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthRange, currentMonthKey } from "@/lib/format";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const { start, end } = monthRange(month);

  const [categories, income, expenses] = await Promise.all([
    prisma.category.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.income.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true },
    }),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    spentByCategory.set(expense.categoryId, (spentByCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }

  const categoryBreakdown = categories.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      budget: category.monthlyBudget,
      spent,
      remaining: category.monthlyBudget - spent,
    };
  });

  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0);
  const totalBudgeted = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
  const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.spent, 0);
  const fixedSpent = categoryBreakdown.filter((c) => c.type === "FIXED").reduce((s, c) => s + c.spent, 0);
  const variableSpent = categoryBreakdown.filter((c) => c.type === "VARIABLE").reduce((s, c) => s + c.spent, 0);
  const fixedBudget = categoryBreakdown.filter((c) => c.type === "FIXED").reduce((s, c) => s + c.budget, 0);
  const variableBudget = categoryBreakdown.filter((c) => c.type === "VARIABLE").reduce((s, c) => s + c.budget, 0);

  // Expenses logged against categories that have since been archived still count against spend,
  // but won't appear in categoryBreakdown since it's sourced from active categories only.
  const unallocatedSpent = expenses
    .filter((e) => !categories.some((c) => c.id === e.categoryId))
    .reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    month,
    totalIncome,
    totalBudgeted,
    totalSpent: totalSpent + unallocatedSpent,
    unallocatedSpent,
    leftover: totalIncome - (totalSpent + unallocatedSpent),
    fixed: { budget: fixedBudget, spent: fixedSpent },
    variable: { budget: variableBudget, spent: variableSpent },
    categories: categoryBreakdown,
  });
}
