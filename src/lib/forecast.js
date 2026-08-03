// ── constants ──────────────────────────────────────────────────────────────────

export const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const STATO_PESO = {
  'In corso':                 1.0,
  'Pagato':                   1.0,
  'Da Pagare':                1.0,
  'In attesa di risposta':    0.4,
  'Da preventivare':          0.4,
  'Perso':                    0,
  'Rifiutato':                0,
  'Non ha più fatto sapere':  0,
};

// ── helpers ────────────────────────────────────────────────────────────────────

function toYM(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseDate(str) {
  const [y, m] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 15));
}

function monthsInRange(startStr, endStr) {
  const start = parseDate(startStr);
  const end   = parseDate(endStr);
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(toYM(cur));
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
}

function pesoStato(stati) {
  for (const s of stati) {
    if (s in STATO_PESO) return STATO_PESO[s];
  }
  return 1.0;
}

// ── core ───────────────────────────────────────────────────────────────────────

/**
 * Builds a map { 'YYYY-MM': { real, proj100, proj40, unatantum } }
 * covering Jan of current year → Dec of next year.
 */
export function buildMonthlyRevenue(clients) {
  const now       = new Date();
  const currentYM = toYM(now);
  const endYM     = `${now.getFullYear() + 1}-12`;

  const map = {};

  const ensure = (ym) => {
    if (!map[ym]) map[ym] = { real: 0, proj100: 0, proj40: 0, unatantum: 0 };
  };

  for (const c of clients) {
    // ── Una tantum ─────────────────────────────────────────────────────────
    if (c.tipoRicavo === 'Una tantum') {
      if (!c.dataIncasso) continue;
      const ym = c.dataIncasso.slice(0, 7);
      ensure(ym);
      map[ym].unatantum += c.mrr;
      continue;
    }

    // ── MRR ricorrente ─────────────────────────────────────────────────────
    if (c.tipoRicavo !== 'MRR ricorrente') continue;
    if (!c.dataInizio) continue;

    const peso = pesoStato(c.stato);
    if (peso === 0) continue;

    const endStr = c.dataFine ?? endYM;
    const months = monthsInRange(c.dataInizio, endStr);

    for (const ym of months) {
      if (ym > endYM) break;
      ensure(ym);
      if (ym <= currentYM) {
        map[ym].real += c.mrr;
      } else if (peso >= 1.0) {
        map[ym].proj100 += c.mrr;
      } else {
        map[ym].proj40 += c.mrr * peso;
      }
    }
  }

  return map;
}

/**
 * Sorted array of 'YYYY-MM' from Jan current year → Dec next year (continuous axis).
 */
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

/** Human label for chart axis */
export function fmtLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MESI_SHORT[m - 1]} '${String(y).slice(2)}`;
}

/** How many labels belong to current year */
export function getYearSplit(labels) {
  const currentYear = String(new Date().getFullYear());
  return labels.filter(ym => ym.startsWith(currentYear)).length;
}

/** Sum of all revenue (real + projected weighted) for a given year string */
export function yearTotal(map, labels, year) {
  return labels
    .filter(ym => ym.startsWith(year))
    .reduce((sum, ym) => {
      const b = map[ym];
      if (!b) return sum;
      return sum + b.real + b.proj100 + b.proj40;
    }, 0);
}

/** Trendline (linear regression) over real + proj100 only */
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

/** Count distinct client names with an active MRR period today */
export function countActiveClients(clients) {
  const now   = toYM(new Date());
  const names = new Set();
  for (const c of clients) {
    if (c.tipoRicavo !== 'MRR ricorrente') continue;
    if (!c.dataInizio) continue;
    const start = c.dataInizio.slice(0, 7);
    const end   = c.dataFine ? c.dataFine.slice(0, 7) : '9999-12';
    if (start <= now && now <= end) names.add(c.nome);
  }
  return names.size;
}

/** Current MRR: sum of mrr for clients with an active period today */
export function currentMRR(clients) {
  const now = toYM(new Date());
  return clients.reduce((sum, c) => {
    if (c.tipoRicavo !== 'MRR ricorrente') return sum;
    if (!c.dataInizio) return sum;
    const start = c.dataInizio.slice(0, 7);
    const end   = c.dataFine ? c.dataFine.slice(0, 7) : '9999-12';
    return (start <= now && now <= end) ? sum + c.mrr : sum;
  }, 0);
}

export function fmt(n) {
  return '€' + Math.round(n).toLocaleString('it-IT');
}
