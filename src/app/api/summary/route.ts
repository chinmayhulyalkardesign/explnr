import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthRange, currentMonthKey } from "@/lib/format";
import { activeForMonth } from "@/lib/category-status";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const { start, end } = monthRange(month);

  const [categories, income, expenses, unbilled] = await Promise.all([
    prisma.category.findMany({
      where: activeForMonth(month),
      orderBy: { name: "asc" },
      include: { budgets: { where: { month } } },
    }),
    prisma.income.findMany({ where: { date: { gte: start, lt: end } } }),
    prisma.expense.findMany({
      where: { date: { gte: start, lt: end } },
      include: { category: true },
    }),
    prisma.monthlyUnbilled.findUnique({ where: { month } }),
  ]);

  // Credits (refunds/reimbursements) are bonus income, not a reduction of any
  // category's spend — they're excluded from category/fixed/variable totals
  // entirely and only bump up effective income for the "saved" figure.
  const debitExpenses = expenses.filter((e) => e.type === "DEBIT");
  const totalCredit = expenses.filter((e) => e.type === "CREDIT").reduce((sum, e) => sum + e.amount, 0);

  const spentByCategory = new Map<string, number>();
  for (const expense of debitExpenses) {
    spentByCategory.set(expense.categoryId, (spentByCategory.get(expense.categoryId) ?? 0) + expense.amount);
  }

  const categoryBreakdown = categories.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    const budget = category.budgets[0]?.amount ?? category.monthlyBudget;
    return {
      id: category.id,
      name: category.name,
      type: category.type,
      budget,
      spent,
      remaining: budget - spent,
    };
  });

  const totalIncome = income.reduce((sum, entry) => sum + entry.amount, 0);
  const totalBudgeted = categoryBreakdown.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.spent, 0);
  const fixedSpent = categoryBreakdown.filter((c) => c.type === "FIXED").reduce((s, c) => s + c.spent, 0);
  const variableSpent = categoryBreakdown.filter((c) => c.type === "VARIABLE").reduce((s, c) => s + c.spent, 0);
  const fixedBudget = categoryBreakdown.filter((c) => c.type === "FIXED").reduce((s, c) => s + c.budget, 0);
  const variableBudget = categoryBreakdown.filter((c) => c.type === "VARIABLE").reduce((s, c) => s + c.budget, 0);

  const topSpent = (type: "FIXED" | "VARIABLE") =>
    categoryBreakdown
      .filter((c) => c.type === type && c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 2)
      .map((c) => ({ name: c.name, spent: c.spent }));

  // Debit expenses logged against categories that have since been archived still count
  // against spend, but won't appear in categoryBreakdown since it's sourced from active
  // categories only.
  const unallocatedSpent = debitExpenses
    .filter((e) => !categories.some((c) => c.id === e.categoryId))
    .reduce((sum, e) => sum + e.amount, 0);

  const netSpent = totalSpent + unallocatedSpent;
  const effectiveIncome = totalIncome + totalCredit;

  return NextResponse.json({
    month,
    totalIncome,
    totalCredit,
    effectiveIncome,
    totalBudgeted,
    totalSpent: netSpent,
    unallocatedSpent,
    saved: effectiveIncome - netSpent,
    unbilled: unbilled?.amount ?? 0,
    fixed: { budget: fixedBudget, spent: fixedSpent, top: topSpent("FIXED") },
    variable: { budget: variableBudget, spent: variableSpent, top: topSpent("VARIABLE") },
    categories: categoryBreakdown,
  });
}
