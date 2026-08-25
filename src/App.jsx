import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import MetricCard from './components/MetricCard.jsx';
import ForecastChart from './components/ForecastChart.jsx';
import ClientTable from './components/ClientTable.jsx';
import MonthDrawer from './components/MonthDrawer.jsx';
import { fetchData } from './lib/notion.js';
import {
  buildMonthlyRevenue, buildUnatantum, buildLabels, getYearSplit,
  yearTotal, yearUnatantum, peakMonth, trendline,
  currentMRR, countActiveClients, buildClientSummary, fmt,
} from './lib/forecast.js';

const STATO_ATTIVO = new Set([
  'In corso', 'Da iniziare', 'Da Pagare', 'In attesa di risposta', 'Pagato',
]);

const pill = (active, color = '#c8f04a', bg = 'rgba(200,240,74,0.08)') => ({
  fontSize: '11px', fontFamily: 'var(--mono)',
  padding: '3px 11px', borderRadius: '20px',
  border: `0.5px solid ${active ? color : 'rgba(255,255,255,0.13)'}`,
  color: active ? color : '#6b6b6b',
  background: active ? bg : 'transparent',
  cursor: 'pointer', transition: 'all .12s',
  whiteSpace: 'nowrap',
});

const SEP = () => (
  <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px', flexShrink: 0 }} />
);

const LABEL = ({ children }) => (
  <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#444', letterSpacing: '.1em', textTransform: 'uppercase' }}>
    {children}
  </span>
);

export default function App() {
  const [fatture, setFatture]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [filterTipoVoce, setFilterTipoVoce] = useState(null);
  const [filterServizio, setFilterServizio] = useState(null);
  const [filterStato, setFilterStato]       = useState('attivi');
  const [selectedMonth, setSelectedMonth]   = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { fatture: f } = await fetchData();
      setFatture(f);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // All distinct services across fatture
  const allServizi = useMemo(() => {
    const s = new Set();
    fatture.forEach(f => f.servizi.forEach(v => s.add(v)));
    return [...s].sort();
  }, [fatture]);

  // Apply filters
  const filteredFatture = useMemo(() => {
    let list = fatture;
    if (filterStato === 'attivi') {
      list = list.filter(f => f.statoLavori.some(s => STATO_ATTIVO.has(s)));
    }
    if (filterServizio) {
      list = list.filter(f => f.servizi.includes(filterServizio));
    }
    if (filterTipoVoce) {
      list = list.filter(f => f.tipoVoce === filterTipoVoce);
    }
    return list;
  }, [fatture, filterStato, filterServizio, filterTipoVoce]);

  const currentYear = new Date().getFullYear();
  const nextYear    = currentYear + 1;

  const labels    = useMemo(() => buildLabels(), []);
  const yearSplit = useMemo(() => getYearSplit(labels), [labels]);

  // Use all fatture for global metrics (not filtered), filtered for chart/table
  const mrrFatture = useMemo(() =>
    filterTipoVoce === 'Una tantum' ? [] : filteredFatture,
  [filteredFatture, filterTipoVoce]);

  const utFatture = useMemo(() =>
    filterTipoVoce === 'MRR ricorrente' ? [] : filteredFatture,
  [filteredFatture, filterTipoVoce]);

  const revenueMap = useMemo(() => buildMonthlyRevenue(mrrFatture), [mrrFatture]);
  const utMap      = useMemo(() => buildUnatantum(utFatture),       [utFatture]);
  const trend      = useMemo(() => trendline(labels, revenueMap),   [labels, revenueMap]);

  // Metrics (always from unfiltered-by-tipoVoce for global cards)
  const allMrrFatture = useMemo(() => {
    let list = fatture;
    if (filterStato === 'attivi') list = list.filter(f => f.statoLavori.some(s => STATO_ATTIVO.has(s)));
    if (filterServizio) list = list.filter(f => f.servizi.includes(filterServizio));
    return list;
  }, [fatture, filterStato, filterServizio]);

  const mrr        = useMemo(() => currentMRR(allMrrFatture),        [allMrrFatture]);
  const nAttivi    = useMemo(() => countActiveClients(allMrrFatture), [allMrrFatture]);
  const allRevMap  = useMemo(() => buildMonthlyRevenue(allMrrFatture), [allMrrFatture]);
  const allUtMap   = useMemo(() => buildUnatantum(allMrrFatture),      [allMrrFatture]);

  const { real: real26, proj: proj26, total: tot26 } = useMemo(
    () => yearTotal(allRevMap, labels, String(currentYear)), [allRevMap, labels, currentYear]
  );
  const { total: tot27 } = useMemo(
    () => yearTotal(allRevMap, labels, String(nextYear)), [allRevMap, labels, nextYear]
  );
  const ut26 = useMemo(
    () => yearUnatantum(allUtMap, labels, String(currentYear)), [allUtMap, labels, currentYear]
  );
  const ut27 = useMemo(
    () => yearUnatantum(allUtMap, labels, String(nextYear)), [allUtMap, labels, nextYear]
  );
  const fatturato26 = tot26 + ut26;
  const fatturato27 = tot27 + ut27;
  const peak = useMemo(() => peakMonth(allRevMap, labels), [allRevMap, labels]);
  const trend0 = useMemo(() => trendline(labels, allRevMap), [labels, allRevMap]);
  const trendDir = trend0.length > 1 ? trend0[trend0.length - 1] > trend0[0] : false;

  // Client table summaries (MRR ricorrente only, apply stato+servizio filters)
  const clientSummaries = useMemo(
    () => buildClientSummary(allMrrFatture),
    [allMrrFatture]
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#444', letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: '4px' }}>
            swotstudios
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: 400, letterSpacing: '-.02em' }}>revenue dashboard</h1>
        </div>
        <button onClick={load} disabled={loading} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '11px', fontFamily: 'var(--mono)', color: '#6b6b6b',
          padding: '6px 14px', border: '0.5px solid rgba(255,255,255,0.13)',
          borderRadius: 'var(--radius)', background: 'transparent', cursor: 'pointer',
          opacity: loading ? 0.4 : 1,
        }}>
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          aggiorna
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '10px 16px',
        marginBottom: '1.25rem',
      }}>
        <LABEL>stato</LABEL>
        {['attivi', 'tutti'].map(f => (
          <button key={f} onClick={() => setFilterStato(f)} style={pill(filterStato === f)}>{f}</button>
        ))}

        <SEP />

        <LABEL>tipo voce</LABEL>
        <button onClick={() => setFilterTipoVoce(null)} style={pill(filterTipoVoce === null, '#5b9cf6', 'rgba(91,156,246,0.08)')}>tutti</button>
        <button onClick={() => setFilterTipoVoce('MRR ricorrente')} style={pill(filterTipoVoce === 'MRR ricorrente', '#5b9cf6', 'rgba(91,156,246,0.08)')}>mrr ricorrente</button>
        <button onClick={() => setFilterTipoVoce('Una tantum')} style={pill(filterTipoVoce === 'Una tantum', '#5b9cf6', 'rgba(91,156,246,0.08)')}>una tantum</button>

        {allServizi.length > 0 && <SEP />}

        {allServizi.length > 0 && <LABEL>servizio</LABEL>}
        {allServizi.length > 0 && (
          <button onClick={() => setFilterServizio(null)} style={pill(filterServizio === null, '#f0924a', 'rgba(240,146,74,0.08)')}>tutti</button>
        )}
        {allServizi.map(s => (
          <button key={s} onClick={() => setFilterServizio(s)} style={pill(filterServizio === s, '#f0924a', 'rgba(240,146,74,0.08)')}>{s}</button>
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgba(224,82,82,0.1)', border: '0.5px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '.75rem 1rem',
          color: 'var(--red)', fontSize: '12px', fontFamily: 'var(--mono)', marginBottom: '1.25rem',
        }}>{error}</div>
      )}

      {/* ── Metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
        <MetricCard label="Clienti attivi" value={nAttivi} sub="MRR ricorrente oggi o futuro" />
        <MetricCard label="MRR corrente" value={fmt(mrr)} sub="mese in corso" />
        <MetricCard
          label={`Totale MRR ${currentYear}`}
          value={fmt(tot26)}
          sub={`${fmt(real26)} reale + ${fmt(proj26)} previsto`}
          accent
        />
        <MetricCard label={`Totale MRR ${nextYear}`} value={fmt(tot27)} sub="proiezione anno completo" accent />
        <MetricCard label={`Una tantum ${currentYear}`} value={fmt(ut26)} sub="extra / spot" />
        <MetricCard label={`Totale fatturato ${currentYear}`} value={fmt(fatturato26)} sub={`MRR + una tantum`} accent />
        <MetricCard label={`Totale fatturato ${nextYear}`} value={fmt(fatturato27)} sub={`MRR + una tantum`} accent />
        <MetricCard label="Picco mensile" value={fmt(peak)} sub={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trendDir
              ? <TrendingUp size={11} color="var(--accent)" />
              : <TrendingDown size={11} color="var(--red)" />}
            <span>{trendDir ? 'trend positivo' : 'trend negativo'}</span>
          </span>
        } />
      </div>

      {/* ── Charts ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <ForecastChart
          labels={labels}
          map={revenueMap}
          utMap={utMap}
          trend={trend}
          yearSplit={yearSplit}
          onMonthClick={setSelectedMonth}
        />
      </div>

      {/* ── Client Table ── */}
      <ClientTable summaries={clientSummaries} loading={loading} />

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.12)' }}>
        swotstudios · fonte: notion / fatture
      </p>

      {selectedMonth && (
        <MonthDrawer
          ym={selectedMonth}
          fatture={filteredFatture}
          onClose={() => setSelectedMonth(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
