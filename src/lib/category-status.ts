import type { Prisma } from "@prisma/client";

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
