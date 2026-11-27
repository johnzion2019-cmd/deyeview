import type { DailyEarnings, MonthlyEarnings } from "@/domain/earnings";

export type RecordDay = {
  period: string;
  label: string;
  kwh: number;
  amount: number;
};

export type PlantRecords = {
  bestDay: RecordDay | null;
  average: { kwh: number; amount: number; days: number } | null;
  bestMonth: { period: string; label: string; amount: number } | null;
};

function dayKwh(day: DailyEarnings): number {
  return day.productionKwh > 0 ? day.productionKwh : day.selfSuppliedKwh;
}

export function buildPlantRecords(daily: DailyEarnings[], monthly: MonthlyEarnings[]): PlantRecords {
  const activeDays = daily.filter((day) => dayKwh(day) > 0 || day.total > 0);
  let bestDay: RecordDay | null = null;
  if (activeDays.length) {
    const top = activeDays.reduce((winner, day) => {
      const winnerKwh = dayKwh(winner);
      const dayKwhValue = dayKwh(day);
      if (dayKwhValue > winnerKwh) return day;
      if (dayKwhValue === winnerKwh && day.total > winner.total) return day;
      return winner;
    });
    bestDay = { period: top.period, label: top.label, kwh: dayKwh(top), amount: top.total };
  }

  const average = activeDays.length
    ? {
        kwh: activeDays.reduce((sum, day) => sum + dayKwh(day), 0) / activeDays.length,
        amount: activeDays.reduce((sum, day) => sum + day.total, 0) / activeDays.length,
        days: activeDays.length,
      }
    : null;

  const activeMonths = monthly.filter((month) => month.total > 0);
  const bestMonth = activeMonths.length
    ? (() => {
        const top = activeMonths.reduce((winner, month) => (month.total > winner.total ? month : winner));
        return { period: top.period, label: top.label, amount: top.total };
      })()
    : null;

  return { bestDay, average, bestMonth };
}
