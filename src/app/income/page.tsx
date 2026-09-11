"use client";

import { FormEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2 } from "lucide-react";
import MonthPicker from "@/components/MonthPicker";
import { currentMonthKey, formatMoney } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { Income } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function IncomePage() {
  const [month, setMonth] = useState(currentMonthKey());
  const key = `/api/income?month=${month}`;
  const { data: entries, isLoading } = useSWR<Income[]>(key, fetcher);
  const [source, setSource] = useState("Salary");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, amount: Number(amount), date, note: note || undefined }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add income");
      }
      setAmount("");
      setNote("");
      mutate(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this income entry?")) return;
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    mutate(key);
  }

  const total = (entries ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_1fr_auto]">
          <input
            required
            placeholder="Source (e.g. Salary)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
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
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Plus size={15} />
            Add
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 text-sm">
          <span className="font-medium">Entries this month</span>
          <span className="tabular-nums text-neutral-500">{formatMoney(total)}</span>
        </div>
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-neutral-500">Loading…</p>
        ) : !entries || entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-500">No income logged for this month.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{entry.source}</div>
                  <div className="text-xs text-neutral-500">
                    {new Date(entry.date).toLocaleDateString("en-IN", { timeZone: "UTC" })}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{formatMoney(entry.amount)}</span>
                  <button
                    onClick={() => remove(entry.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={13} />
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
