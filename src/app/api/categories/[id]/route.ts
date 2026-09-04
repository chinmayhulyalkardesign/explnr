import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCategorySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateCategorySchema.parse(body);
    const category = await prisma.category.update({ where: { id }, data });
    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const expenseCount = await prisma.expense.count({ where: { categoryId: id } });
    if (expenseCount > 0) {
      return NextResponse.json(
        { error: "This category has expenses linked to it. Archive it instead of deleting." },
        { status: 409 },
      );
    }
    await prisma.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
