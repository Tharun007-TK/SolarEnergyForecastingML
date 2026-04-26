import { format } from "date-fns";

// ── CSV Export ──────────────────────────────────────

export function downloadCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

// ── PDF Report (print-ready HTML) ───────────────────

interface ReportSection {
  title: string;
  content: string; // HTML string
}

interface ReportOptions {
  title: string;
  subtitle?: string;
  panelName?: string;
  generatedAt?: string;
  sections: ReportSection[];
}

export function openPrintableReport(opts: ReportOptions) {
  const now = opts.generatedAt ?? format(new Date(), "MMM dd, yyyy HH:mm");

  const sectionsHTML = opts.sections
    .map(
      (s) => `
      <section class="section">
        <h2>${s.title}</h2>
        ${s.content}
      </section>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${opts.title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, -apple-system, sans-serif;
      color: #1a1a1a; line-height: 1.6; padding: 40px;
      max-width: 900px; margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 32px;
    }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header .meta { color: #6b7280; font-size: 13px; margin-top: 6px; }
    .header .meta span { margin-right: 16px; }
    .section { margin-bottom: 32px; }
    .section h2 {
      font-size: 16px; font-weight: 600; color: #374151;
      border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 16px;
    }
    table {
      width: 100%; border-collapse: collapse; font-size: 13px;
    }
    th {
      text-align: left; font-weight: 600; color: #6b7280;
      border-bottom: 2px solid #e5e7eb; padding: 8px 12px;
      text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;
    }
    td {
      padding: 8px 12px; border-bottom: 1px solid #f3f4f6;
    }
    tr:hover td { background: #f9fafb; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .stat-card {
      border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;
    }
    .stat-card .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-card .value { font-size: 22px; font-weight: 700; margin-top: 4px; }
    .stat-card .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .badge {
      display: inline-block; padding: 2px 8px; border-radius: 9999px;
      font-size: 11px; font-weight: 600;
    }
    .badge-red { background: #fef2f2; color: #dc2626; }
    .badge-green { background: #f0fdf4; color: #16a34a; }
    .badge-yellow { background: #fefce8; color: #ca8a04; }
    .footer {
      margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb;
      font-size: 11px; color: #9ca3af; text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>☀️ ${opts.title}</h1>
    <div class="meta">
      ${opts.panelName ? `<span><strong>Panel:</strong> ${opts.panelName}</span>` : ""}
      <span><strong>Generated:</strong> ${now}</span>
    </div>
  </div>
  ${sectionsHTML}
  <div class="footer">
    SolarSense — Solar Panel Monitoring System &middot; Report generated ${now}
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ── Helpers ─────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Table HTML builder ──────────────────────────────

export function tableHTML(headers: string[], rows: (string | number | null | undefined)[][]) {
  const ths = headers.map((h) => `<th>${h}</th>`).join("");
  const trs = rows
    .map(
      (row) =>
        `<tr>${row.map((v) => `<td>${v ?? "—"}</td>`).join("")}</tr>`
    )
    .join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

export function statCardsHTML(stats: { label: string; value: string; sub?: string }[]) {
  return `<div class="stat-grid">${stats
    .map(
      (s) => `
    <div class="stat-card">
      <div class="label">${s.label}</div>
      <div class="value">${s.value}</div>
      ${s.sub ? `<div class="sub">${s.sub}</div>` : ""}
    </div>`
    )
    .join("")}</div>`;
}

export function prBadgeHTML(pr: number | null | undefined) {
  if (pr == null) return "—";
  const cls = pr >= 80 ? "badge-green" : pr >= 60 ? "badge-yellow" : "badge-red";
  return `<span class="badge ${cls}">${pr.toFixed(1)}%</span>`;
}
