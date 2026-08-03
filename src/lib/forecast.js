// ── configurable weights ───────────────────────────────────────────────────────
export const PESO_PREVISIONALE = 0.40;

// ── constants ──────────────────────────────────────────────────────────────────
export const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const STATI_PROJ100 = new Set(['Da emettere', 'Emessa', 'Incassata']);

// ── helpers ────────────────────────────────────────────────────────────────────

function toYM(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentYM() {
  return toYM(new Date());
}

function parseDate(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15));
}

/** Continuous axis Jan current year → Dec next year */
export function buildLabels() {
  const now     = new Date();
  const startYM = `${now.getFullYear()}-01`;
  const endYM   = `${now.getFullYear() + 1}-12`;
  const out = [];
  const cur = parseDate(startYM);
  const end = parseDate(endYM);
  while (cur <= end) {
    out.push(toYM(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

/** How many labels belong to the current year */
export function getYearSplit(labels) {
  const y = String(new Date().getFullYear());
  return labels.filter(l => l.startsWith(y)).length;
}

/** Human readable axis label from YYYY-MM */
export function fmtLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MESI_SHORT[m - 1]} '${String(y).slice(2)}`;
}

export function fmt(n) {
  return '€' + Math.round(n).toLocaleString('it-IT');
}

// ── core aggregation ───────────────────────────────────────────────────────────

/**
 * Builds { 'YYYY-MM': { real, proj100, proj40 } } from MRR ricorrente rows only.
 * No implicit projection: only rows that exist in Fatture count.
 */
export function buildMonthlyRevenue(fatture) {
  const now = currentYM();
  const map = {};

  const ensure = ym => { if (!map[ym]) map[ym] = { real: 0, proj100: 0, proj40: 0 }; };

  for (const f of fatture) {
    if (f.tipoVoce !== 'MRR ricorrente') continue;
    if (!f.meseCompetenza) continue;
    const ym = f.meseCompetenza;
    ensure(ym);
    if (ym <= now) {
      map[ym].real += f.importo;
    } else if (f.stato === 'Previsionale') {
      map[ym].proj40 += f.importo * PESO_PREVISIONALE;
    } else if (STATI_PROJ100.has(f.stato)) {
      map[ym].proj100 += f.importo;
    }
    // stato null or unknown → skip
  }

  return map;
}

/**
 * Builds { 'YYYY-MM': number } from Una tantum rows only.
 * Always 100% (real if past, proj100 if future with confirmed stato, proj40 if Previsionale).
 * Returned flat as total-per-month for the separate display.
 */
export function buildUnatantum(fatture) {
  const now = currentYM();
  const map = {};
  for (const f of fatture) {
    if (f.tipoVoce !== 'Una tantum') continue;
    if (!f.meseCompetenza) continue;
    const ym = f.meseCompetenza;
    if (!map[ym]) map[ym] = { real: 0, proj100: 0, proj40: 0 };
    if (ym <= now) {
      map[ym].real += f.importo;
    } else if (f.stato === 'Previsionale') {
      map[ym].proj40 += f.importo * PESO_PREVISIONALE;
    } else if (STATI_PROJ100.has(f.stato)) {
      map[ym].proj100 += f.importo;
    }
  }
  return map;
}

/** MRR attuale = sum of MRR ricorrente rows for current month */
export function currentMRR(fatture) {
  const now = currentYM();
  return fatture
    .filter(f => f.tipoVoce === 'MRR ricorrente' && f.meseCompetenza === now)
    .reduce((s, f) => s + f.importo, 0);
}

/** DISTINCT clienti with at least one MRR ricorrente row in current month or future */
export function countActiveClients(fatture) {
  const now = currentYM();
  const names = new Set();
  for (const f of fatture) {
    if (f.tipoVoce === 'MRR ricorrente' && f.meseCompetenza >= now) {
      names.add(f.cliente);
    }
  }
  return names.size;
}

/** Sum of all revenue (real + proj100 + proj40) for a given year string */
export function yearTotal(map, labels, year) {
  let real = 0, proj = 0;
  for (const ym of labels) {
    if (!ym.startsWith(year)) continue;
    const b = map[ym];
    if (!b) continue;
    real += b.real;
    proj += b.proj100 + b.proj40;
  }
  return { real, proj, total: real + proj };
}

/** Una tantum total for a given year */
export function yearUnatantum(utMap, labels, year) {
  return labels
    .filter(ym => ym.startsWith(year))
    .reduce((s, ym) => {
      const b = utMap[ym];
      return b ? s + b.real + b.proj100 + b.proj40 : s;
    }, 0);
}

/** Best single month (real + proj100 + proj40) */
export function peakMonth(map, labels) {
  return Math.max(0, ...labels.map(ym => {
    const b = map[ym];
    return b ? b.real + b.proj100 + b.proj40 : 0;
  }));
}

/** Linear trendline over real + proj100 only */
export function trendline(labels, map) {
  const data = labels.map(ym => (map[ym]?.real ?? 0) + (map[ym]?.proj100 ?? 0));
  const n = data.length;
  if (n < 2) return data;
  const sumX  = data.reduce((a, _, i) => a + i, 0);
  const sumY  = data.reduce((a, v) => a + v, 0);
  const sumXY = data.reduce((a, v, i) => a + i * v, 0);
  const sumX2 = data.reduce((a, _, i) => a + i * i, 0);
  const denom = n * sumX2 - sumX ** 2;
  if (!denom) return data;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return data.map((_, i) => Math.max(0, Math.round(slope * i + intercept)));
}

/**
 * Per-client summary for the table.
 * Returns array of { cliente, servizi, statoLavori, mrrCorrente, prossimi3 }
 * where prossimi3 = [{ ym, importo, peso }] for the next 3 months after today.
 */
export function buildClientSummary(fatture) {
  const now = currentYM();

  // Collect next 3 month keys
  const next3 = [];
  const cur = parseDate(now);
  cur.setUTCMonth(cur.getUTCMonth() + 1);
  for (let i = 0; i < 3; i++) {
    next3.push(toYM(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }

  // Group by progettoId
  const byProgetto = {};
  for (const f of fatture) {
    if (f.tipoVoce !== 'MRR ricorrente') continue;
    if (!f.progettoId) continue;
    if (!byProgetto[f.progettoId]) {
      byProgetto[f.progettoId] = {
        cliente:     f.cliente,
        servizi:     f.servizi,
        statoLavori: f.statoLavori,
        notionUrl:   f.notionUrl,
        rows:        [],
      };
    }
    byProgetto[f.progettoId].rows.push(f);
  }

  return Object.values(byProgetto).map(({ cliente, servizi, statoLavori, notionUrl, rows }) => {
    const mrrCorrente = rows
      .filter(f => f.meseCompetenza === now)
      .reduce((s, f) => s + f.importo, 0);

    const prossimi3 = next3.map(ym => {
      const f = rows.find(r => r.meseCompetenza === ym);
      if (!f) return { ym, importo: 0, peso: 0, stato: null };
      const peso = f.meseCompetenza <= now ? 1
        : f.stato === 'Previsionale' ? PESO_PREVISIONALE
        : STATI_PROJ100.has(f.stato) ? 1
        : 0;
      return { ym, importo: f.importo, peso, stato: f.stato };
    });

    return { cliente, servizi, statoLavori, notionUrl, mrrCorrente, prossimi3 };
  }).sort((a, b) => a.cliente.localeCompare(b.cliente));
}
