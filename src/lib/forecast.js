export const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

export const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/**
 * Returns revenue per month from current month to end of next year.
 * e.g. if today is Aug 2026 → returns 17 values: Aug-Dec 2026 + Jan-Dec 2027
 */
export function buildForecast(clients) {
  const now = new Date();
  const startMonth = now.getMonth(); // 0-indexed
  const startYear  = now.getFullYear();
  const endYear    = startYear + 1;

  // months from now to Dec of next year
  const endMonth = 11; // December
  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;

  return Array.from({ length: totalMonths }, (_, i) => {
    const mIdx = (startMonth + i) % 12;
    const meseName = MESI[mIdx];
    return clients.reduce((sum, c) => {
      if (c.mrr === 0) return sum;
      const active = c.mesiAttivi.length === 0 || c.mesiAttivi.includes(meseName);
      return sum + (active ? c.mrr : 0);
    }, 0);
  });
}

/**
 * Returns labels and a boolean array indicating which months belong to next year.
 */
export function buildLabels() {
  const now = new Date();
  const startMonth = now.getMonth();
  const startYear  = now.getFullYear();
  const endYear    = startYear + 1;
  const totalMonths = (endYear - startYear) * 12 + (11 - startMonth) + 1;

  return Array.from({ length: totalMonths }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    return `${MESI_SHORT[m]} '${String(y).slice(2)}`;
  });
}

/**
 * Returns how many months in the forecast belong to current year vs next year.
 */
export function getYearSplit() {
  const now = new Date();
  const startMonth = now.getMonth();
  const currentYearMonths = 12 - startMonth; // e.g. Aug=7 → 5 months (Aug-Dec)
  const nextYearMonths    = 12;
  return { currentYearMonths, nextYearMonths };
}

/** Simple linear regression trendline */
export function trendline(data) {
  const n = data.length;
  const sumX  = data.reduce((a, _, i) => a + i, 0);
  const sumY  = data.reduce((a, v) => a + v, 0);
  const sumXY = data.reduce((a, v, i) => a + i * v, 0);
  const sumX2 = data.reduce((a, _, i) => a + i * i, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2) || 0;
  const b = (sumY - m * sumX) / n;
  return data.map((_, i) => Math.round(m * i + b));
}

export function fmt(n) {
  return '€' + Math.round(n).toLocaleString('it-IT');
}
