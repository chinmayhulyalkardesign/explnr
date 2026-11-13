"use client";

import useSWR from "swr";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Grid3x3, BarChart3, TriangleAlert } from "lucide-react";
import { formatMoney, formatMonthShort } from "@/lib/format";
import { CATEGORICAL, CHART_INK, SEQUENTIAL_HUE, STATUS, sequentialShade, textColorForShade } from "@/lib/chart-colors";
import { fetcher } from "@/lib/fetcher";
import type { SummaryHistory } from "@/lib/types";

function money0(v: number) {
  return formatMoney(v);
}

const axisTick = { fill: CHART_INK.muted, fontSize: 12 };

function ChartCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium">
        <Icon size={15} className="text-neutral-400" />
        {title}
      </div>
      {children}
    </div>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-medium text-neutral-700">{label ? formatMonthShort(label) : ""}</div>
      {payload
        .filter((p) => (p.value ?? 0) !== 0)
        .map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-neutral-500">{p.name}:</span>
            <span className="font-medium tabular-nums text-neutral-900">{money0(p.value ?? 0)}</span>
          </div>
        ))}
    </div>
  );
}

export default function SummaryPage() {
  const { data, isLoading } = useSWR<SummaryHistory>("/api/summary/history", fetcher);

  if (isLoading || !data) {
    return <p className="text-sm text-neutral-500">Loading…</p>;
  }

  if (data.months.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        No income or expenses logged yet. Once you do, this page fills in with trends across every month.
      </p>
    );
  }

  const allTimeIncome = data.trend.reduce((s, t) => s + t.effectiveIncome, 0);
  const allTimeSpent = data.trend.reduce((s, t) => s + t.spent, 0);
  const allTimeSaved = allTimeIncome - allTimeSpent;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">All-time income</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{money0(allTimeIncome)}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">All-time spent</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{money0(allTimeSpent)}</div>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="text-xs font-medium text-neutral-500">All-time saved</div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${allTimeSaved < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {money0(allTimeSaved)}
          </div>
        </div>
      </div>

      <ChartCard icon={TrendingUp} title="Income vs. expenses, every month">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data.trend} margin={{ top: 4, right: 8, left: 8, bottom: 0 }} barGap={4}>
            <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
            <XAxis dataKey="month" tickFormatter={formatMonthShort} tick={axisTick} axisLine={{ stroke: CHART_INK.baseline }} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => money0(v)} width={70} />
            <Tooltip content={<MoneyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: CHART_INK.secondary }} />
            <Bar dataKey="effectiveIncome" name="Income" fill={CATEGORICAL[0]} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="spent" name="Spent" fill={CATEGORICAL[1]} radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="saved" name="Saved" fill={CATEGORICAL[2]} radius={[3, 3, 0, 0]} maxBarSize={28} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard icon={Grid3x3} title="Spend by category, every month">
        <CategoryHeatmap data={data} />
      </ChartCard>

      <ChartCard icon={BarChart3} title="All-time category share, ranked">
        <RankedBars categoryTotals={data.categoryTotals} />
      </ChartCard>
    </div>
  );
}

function CategoryHeatmap({ data }: { data: SummaryHistory }) {
  const max = Math.max(1, ...data.categoryMonthly.flatMap((row) => data.categories.map((c) => Number(row[c]) || 0)));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className="w-28" />
            {data.months.map((m) => (
              <th key={m} className="pb-1 text-center text-xs font-normal text-neutral-500">
                {formatMonthShort(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.categories.map((cat) => (
            <tr key={cat}>
              <td className="whitespace-nowrap pr-2 text-sm text-neutral-700">{cat}</td>
              {data.months.map((m) => {
                const row = data.categoryMonthly.find((r) => r.month === m);
                const value = row ? Number(row[cat]) || 0 : 0;
                const budgetRow = data.categoryBudgetMonthly.find((r) => r.month === m);
                const budget = budgetRow ? Number(budgetRow[cat]) || 0 : 0;
                const overBudget = budget > 0 && value > budget;
                const ratio = value / max;
                return (
                  <td
                    key={m}
                    className="rounded"
                    style={{ background: overBudget ? STATUS.critical : value > 0 ? sequentialShade(ratio) : CHART_INK.grid }}
                  >
                    <div
                      className="flex h-9 min-w-[70px] items-center justify-center gap-1 text-xs tabular-nums"
                      style={{ color: overBudget ? "#ffffff" : value > 0 ? textColorForShade(ratio) : CHART_INK.muted }}
                      title={
                        overBudget
                          ? `${cat} · ${formatMonthShort(m)}: ${money0(value)} — over the ${money0(budget)} budget`
                          : `${cat} · ${formatMonthShort(m)}: ${money0(value)}`
                      }
                    >
                      {overBudget && <TriangleAlert size={11} className="shrink-0" />}
                      {value > 0 ? money0(value) : "—"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
        Darker = more spent that month.
        <span className="inline-flex items-center gap-1 rounded px-1 py-0.5" style={{ background: STATUS.critical, color: "#fff" }}>
          <TriangleAlert size={10} />
          red
        </span>
        = over that month&apos;s budget for the category.
      </p>
    </div>
  );
}

function RankedBars({ categoryTotals }: { categoryTotals: { name: string; spent: number }[] }) {
  const sorted = [...categoryTotals].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const max = Math.max(1, ...sorted.map((c) => c.spent));

  return (
    <div className="space-y-2.5">
      {sorted.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-sm text-neutral-700">{c.name}</span>
          <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100">
            <div
              className="flex h-full items-center justify-end rounded px-1.5"
              style={{ width: `${(c.spent / max) * 100}%`, background: SEQUENTIAL_HUE }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900">{money0(c.spent)}</span>
        </div>
      ))}
    </div>
  );
}
