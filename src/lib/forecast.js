export const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

export const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/** Returns array[12] of revenue for next 12 calendar months from today */
export function buildForecast(clients) {
  const now = new Date();
  const startMonth = now.getMonth(); // 0-indexed

  return Array.from({ length: 12 }, (_, i) => {
    const mIdx = (startMonth + i) % 12;
    const meseName = MESI[mIdx];
    return clients.reduce((sum, c) => {
      const active = c.mesiAttivi.length === 0
        ? true // if no months set, assume always active
        : c.mesiAttivi.includes(meseName);
      return sum + (active ? c.mrr : 0);
    }, 0);
  });
}

/** Month labels for the chart starting from today */
export function buildLabels() {
  const now = new Date();
  const startMonth = now.getMonth();
  const startYear = now.getFullYear();
  return Array.from({ length: 12 }, (_, i) => {
    const m = (startMonth + i) % 12;
    const y = startYear + Math.floor((startMonth + i) / 12);
    return `${MESI_SHORT[m]} '${String(y).slice(2)}`;
  });
}

/** Simple linear regression trendline */
export function trendline(data) {
  const n = data.length;
  const sumX = data.reduce((_, __, i) => _ + i, 0);
  const sumY = data.reduce((a, v) => a + v, 0);
  const sumXY = data.reduce((a, v, i) => a + i * v, 0);
  const sumX2 = data.reduce((a, _, i) => a + i * i, 0);
  const m = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2) || 0;
  const b = (sumY - m * sumX) / n;
  return data.map((_, i) => Math.round(m * i + b));
}

export function fmt(n) {
  return '€' + Math.round(n).toLocaleString('it-IT');
}
