import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { activeForMonth, isArchivedForMonth } from "@/lib/category-status";
import { currentMonthKey } from "@/lib/format";

export async function GET(request: NextRequest) {
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const month = request.nextUrl.searchParams.get("month");
  // Reference month for "is this category archived" -- defaults to the real
  // current month for callers (like the Expenses form) that don't care
  // about per-month budgets and just want "is this usable right now".
  const referenceMonth = month ?? currentMonthKey();

  const categories = await prisma.category.findMany({
    where: includeArchived ? undefined : activeForMonth(referenceMonth),
    orderBy: { name: "asc" },
    include: { budgets: month ? { where: { month } } : { take: 0 } },
  });

  const withEffectiveBudget = categories
    .map((c) => {
      const override = c.budgets[0];
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        monthlyBudget: c.monthlyBudget,
        archived: isArchivedForMonth(c.archivedFrom, referenceMonth),
        budgetForMonth: override ? override.amount : c.monthlyBudget,
        hasOverride: Boolean(override),
      };
    })
    .sort((a, b) => Number(a.archived) - Number(b.archived) || a.name.localeCompare(b.name));

  return NextResponse.json(withEffectiveBudget);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCategorySchema.parse(body);
    const category = await prisma.category.create({ data });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
