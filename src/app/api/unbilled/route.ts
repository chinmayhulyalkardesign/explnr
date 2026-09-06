import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertUnbilledSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";
import { currentMonthKey } from "@/lib/format";

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month") ?? currentMonthKey();
  const record = await prisma.monthlyUnbilled.findUnique({ where: { month } });
  return NextResponse.json({ month, amount: record?.amount ?? 0 });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, amount } = upsertUnbilledSchema.parse(body);
    const record = await prisma.monthlyUnbilled.upsert({
      where: { month },
      create: { month, amount },
      update: { amount },
    });
    return NextResponse.json(record);
  } catch (error) {
    return handleApiError(error);
  }
}
