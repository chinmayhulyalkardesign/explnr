export type CategoryType = "FIXED" | "VARIABLE";
export type ExpenseType = "DEBIT" | "CREDIT";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  monthlyBudget: number;
  archived: boolean;
};

export type Income = {
  id: string;
  source: string;
  amount: number;
  date: string;
  note: string | null;
};

export type Expense = {
  id: string;
  categoryId: string;
  amount: number;
  type: ExpenseType;
  date: string;
  description: string | null;
  category: Category;
};

export type CategorySummary = {
  id: string;
  name: string;
  type: CategoryType;
  budget: number;
  spent: number;
  remaining: number;
};

export type Summary = {
  month: string;
  totalIncome: number;
  totalCredit: number;
  effectiveIncome: number;
  totalBudgeted: number;
  totalSpent: number;
  unallocatedSpent: number;
  saved: number;
  unbilled: number;
  fixed: { budget: number; spent: number };
  variable: { budget: number; spent: number };
  categories: CategorySummary[];
};
