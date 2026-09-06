// Manual CSV import of bank/card statements. Deliberately CSV-only, hand-parsed —
// no third-party spreadsheet library — since those files come from the user's own
// bank export and a parsing library is an attack surface we don't need here.

export type ImportedRow = {
  rid: string;
  name: string;
  date: string; // "" or "YYYY-MM-DD"
  amount: number;
  type: "DEBIT" | "CREDIT";
  categoryId: string; // "" until the user picks one
};

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function parseAmount(v: string): number {
  const cleaned = String(v ?? "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDateStr(v: string): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return "";
}

// Bank descriptions often look like UPI/P2A/<ref no>/{PAYEE NAME}/note/BANK NAME.
// Pull out just the payee-name segment; fall back gracefully otherwise.
function extractPayeeName(desc: string): string {
  const raw = String(desc ?? "").trim();
  if (!raw) return raw;
  const parts = raw.split("/").map((p) => p.trim());
  if (parts.length >= 4 && parts[3]) return parts[3];
  if (parts.length >= 3 && parts[2]) return parts[2];
  return raw;
}

function scoreHeaderRow(row: string[]): number {
  let score = 0;
  for (const cell of row) {
    const c = String(cell ?? "").trim();
    if (!c) continue;
    if (/date/i.test(c)) score++;
    if (/desc|narration|particular|payee|merchant|^name$/i.test(c)) score++;
    if (/debit|withdrawal/i.test(c)) score++;
    if (/credit|deposit/i.test(c)) score++;
    if (/amount|amt/i.test(c)) score++;
  }
  return score;
}

function findHeaderRowIndex(rows: string[][]): number {
  let bestIdx = 0;
  let bestScore = 0;
  const scanLimit = Math.min(rows.length, 15);
  for (let i = 0; i < scanLimit; i++) {
    const s = scoreHeaderRow(rows[i]);
    if (s > bestScore) {
      bestScore = s;
      bestIdx = i;
    }
  }
  return bestScore >= 2 ? bestIdx : 0;
}

function findHeaderIndex(headers: string[], regex: RegExp): number {
  return headers.findIndex((h) => regex.test(h));
}

export function buildRowsFromCsv(text: string): ImportedRow[] {
  const allRows = parseCsv(text);
  if (!allRows.length) return [];

  const headerIdx = findHeaderRowIndex(allRows);
  const headers = allRows[headerIdx].map((h) => String(h ?? "").trim());
  const dataRows = allRows.slice(headerIdx + 1);

  const dateIdx = findHeaderIndex(headers, /date/i);
  const nameIdx =
    findHeaderIndex(headers, /narration|particular|description|desc|payee|merchant|name|item/i) >= 0
      ? findHeaderIndex(headers, /narration|particular|description|desc|payee|merchant|name|item/i)
      : headers.findIndex((_, i) => i !== dateIdx);
  const debitIdx = findHeaderIndex(headers, /debit|withdrawal/i);
  const creditIdx = findHeaderIndex(headers, /credit|deposit/i);
  const amountIdx =
    debitIdx < 0 || creditIdx < 0
      ? headers.findIndex((h, i) => /amount|amt/i.test(h) && !/date/i.test(h) && i !== debitIdx && i !== creditIdx)
      : -1;
  const typeIdx = findHeaderIndex(headers, /^type$/i);
  const mode: "separate" | "single" = debitIdx >= 0 && creditIdx >= 0 ? "separate" : "single";

  const rows: ImportedRow[] = [];
  dataRows.forEach((cells, i) => {
    let amount = 0;
    let type: "DEBIT" | "CREDIT" = "DEBIT";

    if (mode === "separate") {
      const d = parseAmount(cells[debitIdx]);
      const c = parseAmount(cells[creditIdx]);
      if (c > 0) {
        amount = c;
        type = "CREDIT";
      } else {
        amount = d;
        type = "DEBIT";
      }
    } else if (amountIdx >= 0) {
      const raw = parseAmount(cells[amountIdx]);
      amount = Math.abs(raw);
      type = raw < 0 ? "CREDIT" : "DEBIT";
    }

    if (typeIdx >= 0) {
      const tv = String(cells[typeIdx] ?? "").toLowerCase();
      if (tv.includes("credit")) type = "CREDIT";
      else if (tv.includes("debit")) type = "DEBIT";
    }

    const rawName = nameIdx >= 0 ? cells[nameIdx] : "";
    const name = (nameIdx >= 0 ? extractPayeeName(rawName) : "").trim() || "Untitled entry";
    const date = dateIdx >= 0 ? normalizeDateStr(cells[dateIdx]) : "";

    if (amount > 0 || name !== "Untitled entry") {
      rows.push({ rid: `imp_${i}_${Math.random().toString(36).slice(2, 9)}`, name, date, amount, type, categoryId: "" });
    }
  });

  return rows;
}
