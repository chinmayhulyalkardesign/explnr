import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createIncomeSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { monthRange } from "@/lib/format";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");
  const where = month ? { date: { gte: monthRange(month).start, lt: monthRange(month).end } } : undefined;
  const income = await prisma.income.findMany({ where, orderBy: { date: "desc" } });
  return NextResponse.json(income);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createIncomeSchema.parse(body);
    const income = await prisma.income.create({ data });
    return NextResponse.json(income, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
