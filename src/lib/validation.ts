import { z } from "zod";

export const categoryTypeSchema = z.enum(["FIXED", "VARIABLE"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: categoryTypeSchema,
  monthlyBudget: z.coerce.number().nonnegative("Budget cannot be negative").max(100_000_000),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  archived: z.boolean().optional(),
});

export const createIncomeSchema = z.object({
  source: z.string().trim().min(1, "Source is required").max(100),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  date: z.coerce.date(),
  note: z.string().trim().max(500).optional().nullable(),
});

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  date: z.coerce.date(),
  description: z.string().trim().max(500).optional().nullable(),
});
