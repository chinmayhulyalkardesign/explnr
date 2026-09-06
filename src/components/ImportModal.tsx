"use client";

import { useState } from "react";
import { buildRowsFromCsv, type ImportedRow } from "@/lib/statement-import";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  onClose: () => void;
  onImported: () => void;
};

export default function ImportModal({ categories, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileError(null);
    try {
      const text = await file.text();
      const parsed = buildRowsFromCsv(text);
      if (!parsed.length) {
        setFileError("No rows could be read from that file. Check it has a header row (Date, Description, Amount, etc.) with data below it.");
        return;
      }
      setRows(parsed);
    } catch {
      setFileError("Could not read that file. Make sure it's a valid .csv file.");
    }
  }

  function updateRow(rid: string, patch: Partial<ImportedRow>) {
    setRows((prev) => prev.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));
  }

  function removeRow(rid: string) {
    setRows((prev) => prev.filter((r) => r.rid !== rid));
  }

  const missingCat = rows.filter((r) => !r.categoryId).length;
  const invalid = rows.filter((r) => !(r.amount > 0) || !r.name.trim()).length;
  const problems: string[] = [];
  if (missingCat) problems.push(`${missingCat} row(s) need a category`);
  if (invalid) problems.push(`${invalid} row(s) need a name and amount`);
  const canConfirm = rows.length > 0 && missingCat === 0 && invalid === 0;

  async function confirmImport() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        rows: rows.map((r) => ({
          categoryId: r.categoryId,
          amount: r.amount,
          type: r.type,
          date: r.date || new Date().toISOString().slice(0, 10),
          description: r.name,
        })),
      };
      const res = await fetch("/api/expenses/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to import entries");
      }
      onImported();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-sm font-semibold">Import from CSV {rows.length > 0 && `— ${rows.length} row(s)`}</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {rows.length === 0 ? (
            <div>
              <label className="block cursor-pointer rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 hover:border-neutral-400">
                Click to choose a .csv file exported from your bank or card statement
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </label>
              {fileError && <p className="mt-3 text-sm text-red-600">{fileError}</p>}
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500">
                Pick a category for each row, fix anything that looks off, then add them. Rows with no category can&apos;t be added.
              </p>
              <div className="space-y-2">
                {rows.map((r) => (
                  <div key={r.rid} className="grid grid-cols-1 gap-2 border-b border-dashed border-neutral-100 pb-2 sm:grid-cols-[1.4fr_110px_90px_90px_1.2fr_auto] sm:items-center">
                    <input
                      value={r.name}
                      onChange={(e) => updateRow(r.rid, { name: e.target.value })}
                      className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      aria-label="Name"
                    />
                    <input
                      type="date"
                      value={r.date}
                      onChange={(e) => updateRow(r.rid, { date: e.target.value })}
                      className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      aria-label="Date"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) => updateRow(r.rid, { amount: Number(e.target.value) })}
                      className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      aria-label="Amount"
                    />
                    <select
                      value={r.type}
                      onChange={(e) => updateRow(r.rid, { type: e.target.value as "DEBIT" | "CREDIT" })}
                      className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                      aria-label="Type"
                    >
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                    <select
                      value={r.categoryId}
                      onChange={(e) => updateRow(r.rid, { categoryId: e.target.value })}
                      className={`rounded border px-2 py-1.5 text-sm ${!r.categoryId ? "border-red-400 bg-red-50" : "border-neutral-300"}`}
                      aria-label="Category"
                    >
                      <option value="">Choose category…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => removeRow(r.rid)} className="justify-self-end text-neutral-400 hover:text-red-600" aria-label="Remove row">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-5 py-4">
            <span className="text-xs font-medium text-red-600">{problems.join(" · ")}</span>
            <div className="flex gap-2">
              {submitError && <span className="self-center text-xs text-red-600">{submitError}</span>}
              <button onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={!canConfirm || submitting}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Adding…" : `Add ${rows.length} entries`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
