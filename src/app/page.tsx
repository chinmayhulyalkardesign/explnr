"use client";

import { useState } from "react";
import useSWR from "swr";
import { Wallet, Target, Receipt, PiggyBank, Repeat, Shuffle, Layers, type LucideIcon } from "lucide-react";
import MonthPicker from "@/components/MonthPicker";
import UnbilledSlider from "@/components/UnbilledSlider";
import { currentMonthKey, formatMoney } from "@/lib/format";
import { fetcher } from "@/lib/fetcher";
import type { Summary, TopSpendEntry } from "@/lib/types";

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
      <div className="flex items-center justify-end">
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {isLoading || !summary ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              icon={Wallet}
              label="Income"
              value={formatMoney(summary.totalIncome)}
              hint={summary.totalCredit > 0 ? `+ ${formatMoney(summary.totalCredit)} credits` : undefined}
            />
            <StatCard icon={Target} label="Budgeted" value={formatMoney(summary.totalBudgeted)} />
            <StatCard icon={Receipt} label="Spent" value={formatMoney(summary.totalSpent)} />
            <StatCard
              icon={PiggyBank}
              label="Saved"
              value={formatMoney(summary.saved)}
              tone={summary.saved < 0 ? "negative" : "positive"}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Repeat size={15} className="text-neutral-400" />
                  Fixed expenses
                </span>
                <span className="text-neutral-500">
                  {formatMoney(summary.fixed.spent)} / {formatMoney(summary.fixed.budget)}
                </span>
              </div>
              <ProgressBar spent={summary.fixed.spent} budget={summary.fixed.budget} />
              <TopSpendList entries={summary.fixed.top} />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Shuffle size={15} className="text-neutral-400" />
                  Variable expenses
                </span>
                <span className="text-neutral-500">
                  {formatMoney(summary.variable.spent)} / {formatMoney(summary.variable.budget)}
                </span>
              </div>
              <ProgressBar spent={summary.variable.spent} budget={summary.variable.budget} />
              <TopSpendList entries={summary.variable.top} />
            </div>
            <UnbilledSlider month={month} />
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center gap-1.5 border-b border-neutral-200 px-4 py-3 text-sm font-medium">
              <Layers size={15} className="text-neutral-400" />
              By category
            </div>
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

function TopSpendList({ entries }: { entries: TopSpendEntry[] }) {
  if (!entries.length) return null;
  return (
    <div className="mt-2 space-y-0.5 border-t border-neutral-100 pt-2">
      {entries.map((e) => (
        <div key={e.name} className="flex items-center justify-between text-xs text-neutral-500">
          <span className="truncate">{e.name}</span>
          <span className="tabular-nums">{formatMoney(e.spent)}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: "positive" | "negative";
  hint?: string;
}) {
  const toneClass = tone === "negative" ? "text-red-600" : tone === "positive" ? "text-emerald-600" : "text-neutral-900";
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
        <Icon size={14} />
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-emerald-600">{hint}</div>}
    </div>
  );
}
