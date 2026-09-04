"use client";

import { FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import { formatMoney } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { Category, CategoryType } from "@/lib/types";

const KEY = "/api/categories?includeArchived=true";

export default function CategoriesPage() {
  const { data: categories, isLoading } = useSWR<Category[]>(KEY, fetcher);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("FIXED");
  const [budget, setBudget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      mutate(KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleArchive(category: Category) {
    await fetch(`/api/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !category.archived }),
    });
    mutate(KEY);
  }

  async function remove(category: Category) {
    if (!confirm(`Delete "${category.name}"? This only works if it has no expenses logged.`)) return;
    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Failed to delete category");
      return;
    }
    mutate(KEY);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Categories</h1>

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
            placeholder="Monthly budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm"
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
                  <span className="text-sm tabular-nums text-neutral-500">{formatMoney(c.monthlyBudget)}</span>
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
