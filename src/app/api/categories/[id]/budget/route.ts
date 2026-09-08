import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertCategoryBudgetSchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { month, amount } = upsertCategoryBudgetSchema.parse(body);

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const budget = await prisma.categoryBudget.upsert({
      where: { categoryId_month: { categoryId: id, month } },
      create: { categoryId: id, month, amount },
      update: { amount },
    });
    return NextResponse.json(budget);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const month = request.nextUrl.searchParams.get("month");
    if (!month) {
      return NextResponse.json({ error: "month is required" }, { status: 400 });
    }
    await prisma.categoryBudget.deleteMany({ where: { categoryId: id, month } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
