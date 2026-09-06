"use client";

import { useState } from "react";
import useSWR from "swr";
import MonthPicker from "@/components/MonthPicker";
import UnbilledSlider from "@/components/UnbilledSlider";
import { currentMonthKey, formatMoney } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { Summary } from "@/lib/types";

function ProgressBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : spent > 0 ? 100 : 0;
  const over = budget > 0 && spent > budget;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
      <div
        className={`h-full rounded-full ${over ? "bg-red-500" : "bg-neutral-900"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonthKey());
  const { data: summary, isLoading } = useSWR<Summary>(`/api/summary?month=${month}`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {isLoading || !summary ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Income"
              value={formatMoney(summary.totalIncome)}
              hint={summary.totalCredit > 0 ? `+ ${formatMoney(summary.totalCredit)} credits` : undefined}
            />
            <StatCard label="Budgeted" value={formatMoney(summary.totalBudgeted)} />
            <StatCard label="Spent" value={formatMoney(summary.totalSpent)} />
            <StatCard
              label="Saved"
              value={formatMoney(summary.saved)}
              tone={summary.saved < 0 ? "negative" : "positive"}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Fixed expenses</span>
                <span className="text-neutral-500">
                  {formatMoney(summary.fixed.spent)} / {formatMoney(summary.fixed.budget)}
                </span>
              </div>
              <ProgressBar spent={summary.fixed.spent} budget={summary.fixed.budget} />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">Variable expenses</span>
                <span className="text-neutral-500">
                  {formatMoney(summary.variable.spent)} / {formatMoney(summary.variable.budget)}
                </span>
              </div>
              <ProgressBar spent={summary.variable.spent} budget={summary.variable.budget} />
            </div>
            <UnbilledSlider month={month} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-4 py-3 text-sm font-medium">By category</div>
            {summary.categories.length === 0 ? (
              <p className="px-4 py-6 text-sm text-neutral-500">
                No categories yet. Add one on the Categories page to start budgeting.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {summary.categories.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        {c.name}
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            c.type === "FIXED" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {c.type}
                        </span>
                      </span>
                      <span
                        className={`tabular-nums ${c.remaining < 0 ? "text-red-600" : "text-neutral-500"}`}
                      >
                        {formatMoney(c.spent)} / {formatMoney(c.budget)}
                      </span>
                    </div>
                    <ProgressBar spent={c.spent} budget={c.budget} />
                  </li>
                ))}
              </ul>
            )}
            {summary.unallocatedSpent > 0 && (
              <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500">
                Includes {formatMoney(summary.unallocatedSpent)} spent against archived categories.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  hint?: string;
}) {
  const toneClass = tone === "negative" ? "text-red-600" : tone === "positive" ? "text-emerald-600" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-emerald-600">{hint}</div>}
    </div>
  );
}
