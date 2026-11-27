const MS_PER_MONTH = 30.4375 * 24 * 60 * 60 * 1000;

export type Payback = {
  systemCost: number;
  totalSaved: number;
  remaining: number;
  paidOffPct: number;
  averageMonthlySavings: number | null;
  monthsToBreakEven: number | null;
  breakEvenLabel: string | null;
};

export function buildPayback(input: {
  systemCost: number;
  lifetimeTotal: number;
  monthly: { total: number }[];
  now: number;
  timeZone: string;
}): Payback {
  const systemCost = Math.max(0, Number.isFinite(input.systemCost) ? input.systemCost : 0);
  const totalSaved = Math.max(0, Number.isFinite(input.lifetimeTotal) ? input.lifetimeTotal : 0);
  const remaining = Math.max(0, systemCost - totalSaved);
  const paidOffPct = systemCost > 0 ? Math.min(100, (totalSaved / systemCost) * 100) : 0;
  const activeMonths = input.monthly.filter((month) => Number.isFinite(month.total) && month.total > 0);
  const averageMonthlySavings =
    activeMonths.length > 0 ? activeMonths.reduce((sum, month) => sum + month.total, 0) / activeMonths.length : null;

  if (systemCost <= 0) {
    return {
      systemCost: 0,
      totalSaved,
      remaining: 0,
      paidOffPct: 0,
      averageMonthlySavings,
      monthsToBreakEven: null,
      breakEvenLabel: null,
    };
  }

  if (remaining <= 0) {
    return {
      systemCost,
      totalSaved,
      remaining: 0,
      paidOffPct: 100,
      averageMonthlySavings,
      monthsToBreakEven: 0,
      breakEvenLabel: "Paid off",
    };
  }

  if (!averageMonthlySavings || averageMonthlySavings <= 0) {
    return {
      systemCost,
      totalSaved,
      remaining,
      paidOffPct,
      averageMonthlySavings,
      monthsToBreakEven: null,
      breakEvenLabel: null,
    };
  }

  const monthsToBreakEven = remaining / averageMonthlySavings;
  const breakEvenAt = input.now + monthsToBreakEven * MS_PER_MONTH;
  const breakEvenLabel = new Intl.DateTimeFormat("en", {
    timeZone: input.timeZone,
    month: "short",
    year: "numeric",
  }).format(new Date(breakEvenAt));

  return {
    systemCost,
    totalSaved,
    remaining,
    paidOffPct,
    averageMonthlySavings,
    monthsToBreakEven,
    breakEvenLabel,
  };
}

export function paybackProgressLabel(payback: Payback): string {
  if (payback.systemCost <= 0) return "Add what the system cost to track payback.";
  if (payback.monthsToBreakEven === 0) return "The install cost is covered.";
  if (payback.breakEvenLabel && payback.monthsToBreakEven != null) {
    const months = payback.monthsToBreakEven < 1.5 ? payback.monthsToBreakEven.toFixed(1) : Math.round(payback.monthsToBreakEven).toString();
    return `About ${months} months · ${payback.breakEvenLabel}`;
  }
  return "Savings will start the clock once a month closes with a balance.";
}
