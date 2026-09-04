import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validation";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  const categories = await prisma.category.findMany({
    where: includeArchived ? undefined : { archived: false },
    orderBy: [{ archived: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(categories);
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
