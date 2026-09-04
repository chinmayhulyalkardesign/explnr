import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { monthRange } from "@/lib/format";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  const where = {
    ...(month ? { date: { gte: monthRange(month).start, lt: monthRange(month).end } } : {}),
    ...(categoryId ? { categoryId } : {}),
  };
  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createExpenseSchema.parse(body);
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    const expense = await prisma.expense.create({ data, include: { category: true } });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
