import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { monthKey } from "@/lib/format";

const MAX_CATEGORY_SLOTS = 7;

function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

export async function GET() {
  const [incomes, expenses, categories, budgetOverrides] = await Promise.all([
    prisma.income.findMany(),
    prisma.expense.findMany({ include: { category: true } }),
    prisma.category.findMany(),
    prisma.categoryBudget.findMany(),
  ]);

  if (!incomes.length && !expenses.length) {
    return NextResponse.json({
      months: [],
      trend: [],
      categories: [],
      categoryMonthly: [],
      categoryBudgetMonthly: [],
      categoryTotals: [],
    });
  }

  const allMonths = [...incomes.map((i) => monthKey(i.date)), ...expenses.map((e) => monthKey(e.date))];
  const months = monthsBetween(allMonths.reduce((a, b) => (a < b ? a : b)), allMonths.reduce((a, b) => (a > b ? a : b)));

  const categoryNameById = new Map(categories.map((c) => [c.id, { name: c.name, type: c.type }]));

  // All-time debit spend per category, to decide which categories get their
  // own slot (richest ones) vs. folding into "Other".
  const allTimeSpend = new Map<string, number>();
  for (const e of expenses) {
    if (e.type !== "DEBIT") continue;
    const key = categoryNameById.get(e.categoryId)?.name ?? e.category.name;
    allTimeSpend.set(key, (allTimeSpend.get(key) ?? 0) + e.amount);
  }
  const topCategories = [...allTimeSpend.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_CATEGORY_SLOTS)
    .map(([name]) => name);
  const topSet = new Set(topCategories);
  const hasOther = [...allTimeSpend.keys()].some((name) => !topSet.has(name));
  const categoryLabels = hasOther ? [...topCategories, "Other"] : topCategories;

  const byMonth = new Map<
    string,
    {
      income: number;
      credit: number;
      debit: number;
      fixedDebit: number;
      variableDebit: number;
      investmentDebit: number;
      byCategory: Map<string, number>;
    }
  >();
  for (const m of months) {
    byMonth.set(m, { income: 0, credit: 0, debit: 0, fixedDebit: 0, variableDebit: 0, investmentDebit: 0, byCategory: new Map() });
  }

  for (const inc of incomes) {
    byMonth.get(monthKey(inc.date))!.income += inc.amount;
  }
  for (const exp of expenses) {
    const bucket = byMonth.get(monthKey(exp.date));
    if (!bucket) continue;
    if (exp.type === "CREDIT") {
      bucket.credit += exp.amount;
      continue;
    }
    const info = categoryNameById.get(exp.categoryId) ?? { name: exp.category.name, type: exp.category.type };
    if (info.type === "INVESTMENT") {
      bucket.investmentDebit += exp.amount;
    } else {
      bucket.debit += exp.amount;
      if (info.type === "FIXED") bucket.fixedDebit += exp.amount;
      else bucket.variableDebit += exp.amount;
    }

    const label = topSet.has(info.name) ? info.name : "Other";
    bucket.byCategory.set(label, (bucket.byCategory.get(label) ?? 0) + exp.amount);
  }

  const trend = months.map((month) => {
    const b = byMonth.get(month)!;
    const effectiveIncome = b.income + b.credit;
    return {
      month,
      income: b.income,
      effectiveIncome,
      spent: b.debit,
      saved: effectiveIncome - b.debit - b.investmentDebit,
      fixedSpent: b.fixedDebit,
      variableSpent: b.variableDebit,
      sipSpent: b.investmentDebit,
    };
  });

  const categoryMonthly = months.map((month) => {
    const b = byMonth.get(month)!;
    const row: Record<string, number | string> = { month };
    for (const label of categoryLabels) {
      row[label] = b.byCategory.get(label) ?? 0;
    }
    return row;
  });

  // Effective budget per (category, month): an override for that month if
  // one was set, else the category's standing default -- same rule the
  // Categories page itself uses, so "overspent" here means the budget that
  // actually applied at the time, not today's.
  const overrideByKey = new Map(budgetOverrides.map((b) => [`${b.categoryId}_${b.month}`, b.amount]));
  function effectiveBudget(categoryId: string, month: string, fallback: number): number {
    return overrideByKey.get(`${categoryId}_${month}`) ?? fallback;
  }

  const categoryBudgetMonthly = months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const label of categoryLabels) row[label] = 0;
    for (const cat of categories) {
      const label = topSet.has(cat.name) ? cat.name : hasOther ? "Other" : null;
      if (!label) continue;
      row[label] = (Number(row[label]) || 0) + effectiveBudget(cat.id, month, cat.monthlyBudget);
    }
    return row;
  });

  const categoryTotals = categoryLabels.map((label) => ({
    name: label,
    spent:
      label === "Other"
        ? [...allTimeSpend.entries()].filter(([name]) => !topSet.has(name)).reduce((s, [, v]) => s + v, 0)
        : (allTimeSpend.get(label) ?? 0),
  }));

  return NextResponse.json({
    months,
    trend,
    categories: categoryLabels,
    categoryMonthly,
    categoryBudgetMonthly,
    categoryTotals,
  });
}
