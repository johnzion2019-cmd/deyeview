import type { EarningsReport } from "@/domain/earnings";

function csvCell(value: string | number): string {
  const text = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function line(cells: Array<string | number>): string {
  return cells.map(csvCell).join(",");
}

export function buildEarningsCsv(earnings: EarningsReport, currency: string, plantName: string): string {
  const code = currency.trim().toUpperCase() || "USD";
  const rows: string[] = [
    line(["DeyeView energy report", plantName]),
    line(["Currency", code]),
    "",
    "Monthly Summary",
    line(["Month", `Consumption savings ${code}`, `Feed-in ${code}`, `Total ${code}`, "Production kWh"]),
    ...earnings.monthly.map((month) =>
      line([month.period, month.consumptionSavings, month.feedInEarnings, month.total, month.productionKwh]),
    ),
    "",
    "Daily History",
    line(["Date", "Production kWh", "Self-supplied kWh", `Consumption savings ${code}`, `Feed-in ${code}`, `Total ${code}`]),
    ...earnings.daily.map((day) =>
      line([day.period, day.productionKwh, day.selfSuppliedKwh, day.consumptionSavings, day.feedInEarnings, day.total]),
    ),
  ];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}

export function csvFilename(ymd: string): string {
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : "report";
  return `deyeview-report-${safe}.csv`;
}
