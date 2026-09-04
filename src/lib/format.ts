const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(amount: number): string {
  return currencyFormatter.format(amount);
}

/** "2026-09" style key for grouping/filtering by calendar month. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKey(new Date());
}

/** [start, end) half-open UTC range for a "YYYY-MM" key, for date filtering. */
export function monthRange(key: string): { start: Date; end: Date } {
  const [year, month] = key.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export function formatMonthLabel(key: string): string {
  const { start } = monthRange(key);
  return start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
