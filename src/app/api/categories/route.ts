import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const month = request.nextUrl.searchParams.get("month");

  const categories = await prisma.category.findMany({
    where: includeArchived ? undefined : { archived: false },
    orderBy: [{ archived: "asc" }, { name: "asc" }],
    include: { budgets: month ? { where: { month } } : { take: 0 } },
  });

  const withEffectiveBudget = categories.map((c) => {
    const override = c.budgets[0];
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      monthlyBudget: c.monthlyBudget,
      archived: c.archived,
      budgetForMonth: override ? override.amount : c.monthlyBudget,
      hasOverride: Boolean(override),
    };
  });

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
