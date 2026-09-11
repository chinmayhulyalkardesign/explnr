import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createExpenseSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { monthRange } from "@/lib/format";

function dateRangeWhere(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  if (month) {
    const { start, end } = monthRange(month);
    return { gte: start, lt: end };
  }

  // Arbitrary inclusive [from, to] range of "YYYY-MM-DD" dates — used by the
  // CSV import duplicate check, which needs to look across whatever span a
  // statement export covers, not just a single calendar month.
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (from && to) {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);
    return { gte: start, lt: end };
  }

  return undefined;
}

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  const dateWhere = dateRangeWhere(request);
  const where = {
    ...(dateWhere ? { date: dateWhere } : {}),
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
