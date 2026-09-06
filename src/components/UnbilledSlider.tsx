"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";

const CAP = 80_000;

export default function UnbilledSlider({ month }: { month: string }) {
  const key = `/api/unbilled?month=${month}`;
  const { data } = useSWR<{ month: string; amount: number }>(key, fetcher);
  const [draft, setDraft] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const value = draft ?? data?.amount ?? 0;
  const over = value > CAP * 0.9;

  async function commit(v: number) {
    setSaving(true);
    try {
      await fetch("/api/unbilled", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, amount: v }),
      });
      await mutate(key);
    } finally {
      setDraft(null);
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">Unbilled credit card</span>
        <span className={`tabular-nums ${over ? "text-red-600" : "text-neutral-500"}`}>
          {formatMoney(value)} / {formatMoney(CAP)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={CAP}
        step={500}
        value={value}
        onChange={(e) => setDraft(Number(e.target.value))}
        onMouseUp={(e) => commit(Number(e.currentTarget.value))}
        onTouchEnd={(e) => commit(Number(e.currentTarget.value))}
        onKeyUp={(e) => commit(Number(e.currentTarget.value))}
        className="w-full accent-neutral-900"
        aria-label="Unbilled credit card amount"
      />
      <p className="mt-1 text-xs text-neutral-500">
        What you&apos;ll owe next month for card spend that hasn&apos;t billed yet. Not counted in this month&apos;s spend.
        {saving && " Saving…"}
      </p>
    </div>
  );
}
