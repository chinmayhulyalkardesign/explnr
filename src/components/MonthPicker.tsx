"use client";

import { formatMonthLabel, monthRange } from "@/lib/format";

type Props = {
  month: string;
  onChange: (month: string) => void;
};

function shiftMonth(key: string, delta: number): string {
  const { start } = monthRange(key);
  const shifted = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function MonthPicker({ month, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
        aria-label="Previous month"
      >
        ←
      </button>
      <span className="min-w-36 text-center text-sm font-medium">{formatMonthLabel(month)}</span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        className="rounded-md border border-neutral-300 px-2 py-1 text-sm hover:bg-neutral-100"
        aria-label="Next month"
      >
        →
      </button>
    </div>
  );
}
