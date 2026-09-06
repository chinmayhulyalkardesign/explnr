"use client";

import { FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import MonthPicker from "@/components/MonthPicker";
import ImportModal from "@/components/ImportModal";
import { currentMonthKey, formatMoney } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { Category, Expense, ExpenseType } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const expensesKey = `/api/expenses?month=${month}`;
  const { data: expenses, isLoading } = useSWR<Expense[]>(expensesKey, fetcher);
  const { data: categories } = useSWR<Category[]>("/api/categories", fetcher);

  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<ExpenseType>("DEBIT");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const selectedCategoryId = categoryId || categories?.[0]?.id || "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedCategoryId) {
      setError("Add a category first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          amount: Number(amount),
          type,
          date,
          description: description || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add expense");
      }
      setAmount("");
      setDescription("");
      setType("DEBIT");
      mutate(expensesKey);
      mutate((key) => typeof key === "string" && key.startsWith("/api/summary"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    mutate(expensesKey);
    mutate((key) => typeof key === "string" && key.startsWith("/api/summary"));
  }

  const debitTotal = (expenses ?? []).filter((e) => e.type === "DEBIT").reduce((sum, e) => sum + e.amount, 0);
  const creditTotal = (expenses ?? []).filter((e) => e.type === "CREDIT").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Expenses</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_100px_auto_auto_1fr_auto]">
          <select
            required
            value={selectedCategoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            {(!categories || categories.length === 0) && <option value="">No categories yet</option>}
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ExpenseType)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="DEBIT">Debit</option>
            <option value="CREDIT">Credit</option>
          </select>
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-36 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting || !categories || categories.length === 0}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 text-sm">
          <span className="font-medium">Expenses this month</span>
          <div className="flex items-center gap-4">
            <span className="tabular-nums text-neutral-500">
              − {formatMoney(debitTotal)}
              {creditTotal > 0 && <span className="text-emerald-600"> · + {formatMoney(creditTotal)}</span>}
            </span>
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              Import CSV
            </button>
          </div>
        </div>
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>
        ) : !expenses || expenses.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">No expenses logged for this month.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {expenses.map((expense) => (
              <li key={expense.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    {expense.category.name}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        expense.category.type === "FIXED"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {expense.category.type}
                    </span>
                    {expense.type === "CREDIT" && (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                        Credit
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {new Date(expense.date).toLocaleDateString("en-IN", { timeZone: "UTC" })}
                    {expense.description ? ` · ${expense.description}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`tabular-nums ${expense.type === "CREDIT" ? "text-emerald-600" : ""}`}>
                    {expense.type === "CREDIT" ? "+" : "−"} {formatMoney(expense.amount)}
                  </span>
                  <button
                    onClick={() => remove(expense.id)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {importOpen && categories && (
        <ImportModal
          categories={categories}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            mutate(expensesKey);
            mutate((key) => typeof key === "string" && key.startsWith("/api/summary"));
          }}
        />
      )}
    </div>
  );
}
