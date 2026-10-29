export function fmtIndex(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPremium(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = a >= 0.1 ? 4 : a >= 0.001 ? 5 : 6;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtPx(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtUsd(n: number, signed = false): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = a >= 10000 ? 0 : 2;
  const body = a.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  return `${sign}$${body}`;
}

export function fmtCoin(n: number, signed = false): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const d = a >= 100 ? 2 : a >= 1 ? 3 : 4;
  const body = a.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  return sign + body;
}

export function fmtGreek(n: number, signed = false): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a !== 0 && a < 0.0001) {
    const exp = n.toExponential(2);
    return signed && n > 0 ? `+${exp}` : exp;
  }
  const d = a >= 100 ? 2 : a >= 1 ? 2 : a >= 0.01 ? 4 : 5;
  const body = a.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
  const sign = n < 0 ? "-" : signed && n > 0 ? "+" : "";
  return sign + body;
}

export function fmtAxis(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 10000) {
    return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtIv(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function fmtDelta(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

export function fmtExpiry(ts: number): string {
  const d = new Date(ts);
  const day = d.getUTCDate();
  const mon = d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${day} ${mon} ${yr}`;
}

export function fmtDte(ts: number, now: number): string {
  const days = (ts - now) / 86_400_000;
  if (days < 1) {
    const hours = Math.max(0, Math.round(days * 24));
    return `${hours}h`;
  }
  if (days < 10) return `${days.toFixed(1)}d`;
  return `${Math.round(days)}d`;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function instrumentDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = MONTHS[d.getUTCMonth()];
  const yr = String(d.getUTCFullYear()).slice(2);
  return `${day}${mon}${yr}`;
}
