export type CategoryType = "FIXED" | "VARIABLE";
export type ExpenseType = "DEBIT" | "CREDIT";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  monthlyBudget: number;
  archived: boolean;
};

// Returned by GET /api/categories?month=YYYY-MM
export type CategoryWithMonthBudget = Category & {
  budgetForMonth: number;
  hasOverride: boolean;
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

export type TopSpendEntry = { name: string; spent: number };

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
  fixed: { budget: number; spent: number; top: TopSpendEntry[] };
  variable: { budget: number; spent: number; top: TopSpendEntry[] };
  categories: CategorySummary[];
};

export type MonthTrendPoint = {
  month: string;
  income: number;
  effectiveIncome: number;
  spent: number;
  saved: number;
  fixedSpent: number;
  variableSpent: number;
};

// Each row is { month: string, [categoryLabel: string]: number }
export type CategoryMonthlyRow = Record<string, number | string>;

export type SummaryHistory = {
  months: string[];
  trend: MonthTrendPoint[];
  categories: string[];
  categoryMonthly: CategoryMonthlyRow[];
  categoryBudgetMonthly: CategoryMonthlyRow[];
  categoryTotals: { name: string; spent: number }[];
};
