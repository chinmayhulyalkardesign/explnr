import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importExpensesSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows } = importExpensesSchema.parse(body);

    const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
    const categories = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    if (categories.length !== categoryIds.length) {
      return NextResponse.json({ error: "One or more categories were not found" }, { status: 404 });
    }

    const created = await prisma.expense.createMany({ data: rows });
    return NextResponse.json({ count: created.count }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
