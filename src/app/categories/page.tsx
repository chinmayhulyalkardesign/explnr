"use client";

import { FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import MonthPicker from "@/components/MonthPicker";
import { currentMonthKey, formatMoney, formatMonthLabel } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { CategoryType, CategoryWithMonthBudget } from "@/lib/types";

function keyFor(month: string) {
  return `/api/categories?includeArchived=true&month=${month}`;
}

export default function CategoriesPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const key = keyFor(month);
  const { data: categories, isLoading } = useSWR<CategoryWithMonthBudget[]>(key, fetcher);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("FIXED");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    mutate(key);
    mutate((k) => typeof k === "string" && k.startsWith("/api/summary"));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, monthlyBudget: Number(budget) }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to create category");
      }
      setName("");
      setBudget("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArchive(category: CategoryWithMonthBudget) {
    await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !category.archived }),
    });
    refresh();
  }

  async function remove(category: CategoryWithMonthBudget) {
    if (!confirm(`Delete "${category.name}"? This only works if it has no expenses logged.`)) return;
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Failed to delete category");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Categories</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input
            required
            placeholder="Category name (e.g. Rent, Groceries)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CategoryType)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="FIXED">Fixed</option>
            <option value="VARIABLE">Variable</option>
          </select>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="Default monthly budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-44 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-xs text-neutral-500">
          Budget shown/edited below is for <span className="font-medium text-neutral-700">{formatMonthLabel(month)}</span>{" "}
          only — changing it doesn&apos;t affect any other month.
        </div>
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>
        ) : !categories || categories.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${c.archived ? "text-neutral-400 line-through" : ""}`}>
                    {c.name}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      c.type === "FIXED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {c.type}
                  </span>
                  {c.archived && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {c.archived ? (
                    <span className="text-sm tabular-nums text-neutral-400">{formatMoney(c.budgetForMonth)}</span>
                  ) : (
                    <MonthBudgetCell category={c} month={month} onSaved={refresh} />
                  )}
                  <button
                    onClick={() => toggleArchive(c)}
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
                  >
                    {c.archived ? "Unarchive" : "Archive"}
                  </button>
                  <button onClick={() => remove(c)} className="text-xs font-medium text-red-600 hover:text-red-800">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MonthBudgetCell({
  category,
  month,
  onSaved,
}: {
  category: CategoryWithMonthBudget;
  month: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const value = draft ?? String(category.budgetForMonth);

  async function commit() {
    const amount = Number(draft);
    setDraft(null);
    if (draft === null || !Number.isFinite(amount) || amount === category.budgetForMonth) return;
    setSaving(true);
    try {
      await fetch(`/api/categories/${category.id}/budget`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, amount }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    setSaving(true);
    try {
      await fetch(`/api/categories/${category.id}/budget?month=${month}`, { method: "DELETE" });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {category.hasOverride && (
        <button
          onClick={resetToDefault}
          title={`Reset to default (${formatMoney(category.monthlyBudget)})`}
          className="text-[10px] font-medium text-neutral-400 hover:text-neutral-700"
        >
          reset
        </button>
      )}
      <span className="text-neutral-400">₹</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`w-24 rounded border px-2 py-1 text-right text-sm tabular-nums ${
          category.hasOverride ? "border-blue-300 bg-blue-50" : "border-neutral-300"
        }`}
        aria-label={`${category.name} budget for ${month}`}
      />
    </div>
  );
}
