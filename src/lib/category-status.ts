import type { Prisma } from "@prisma/client";
import type { CategoryType } from "./types";

export function categoryTypeBadgeClass(type: CategoryType): string {
  if (type === "FIXED") return "bg-blue-100 text-blue-700";
  if (type === "VARIABLE") return "bg-amber-100 text-amber-700";
  return "bg-violet-100 text-violet-700";
}

/**
 * Prisma `where` fragment: categories active *as of* the given month.
 * "YYYY-MM" strings sort lexicographically the same as chronologically, so
 * plain string comparison works for the cutoff.
 */
export function activeForMonth(month: string): Prisma.CategoryWhereInput {
  return { OR: [{ archivedFrom: null }, { archivedFrom: { gt: month } }] };
}

/** Whether a category (given its archivedFrom) is archived as of the given month. */
export function isArchivedForMonth(archivedFrom: string | null, month: string): boolean {
  return archivedFrom !== null && archivedFrom <= month;
}
