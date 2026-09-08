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

export const expenseTypeSchema = z.enum(["DEBIT", "CREDIT"]);

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  type: expenseTypeSchema.default("DEBIT"),
  date: z.coerce.date(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const importExpenseRowSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(100_000_000),
  type: expenseTypeSchema.default("DEBIT"),
  date: z.coerce.date(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const importExpensesSchema = z.object({
  rows: z.array(importExpenseRowSchema).min(1).max(1000),
});

export const upsertUnbilledSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  amount: z.coerce.number().min(0, "Amount cannot be negative").max(80_000, "Cap is ₹80,000"),
});

export const upsertCategoryBudgetSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  amount: z.coerce.number().nonnegative("Budget cannot be negative").max(100_000_000),
});
