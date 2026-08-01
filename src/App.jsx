import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import MetricCard from './components/MetricCard.jsx';
import ForecastChart from './components/ForecastChart.jsx';
import ClientRow from './components/ClientRow.jsx';
import { fetchClients } from './lib/notion.js';
import { buildForecast, buildLabels, trendline, fmt } from './lib/forecast.js';

const STATO_ATTIVO = new Set(['In corso', 'Da iniziare', 'Da Pagare', 'In attesa di risposta']);

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
  const [clients, setClients]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [filterStato, setFilterStato]       = useState('attivi');
  const [filterServizio, setFilterServizio] = useState(null);
  const [filterTipo, setFilterTipo]         = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
      setReloadKey(k => k + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allServizi = useMemo(() => {
    const set = new Set();
    clients.forEach(c => c.servizi.forEach(s => set.add(s)));
    return [...set].sort();
  }, [clients]);

  const visibleClients = useMemo(() => {
    let list = filterStato === 'attivi'
      ? clients.filter(c => c.stato.some(s => STATO_ATTIVO.has(s)))
      : clients;
    if (filterServizio) list = list.filter(c => c.servizi.includes(filterServizio));
    if (filterTipo === 'ricorrente') list = list.filter(c => c.mrr > 0);
    if (filterTipo === 'una tantum')  list = list.filter(c => c.mrr === 0);
    return list;
  }, [clients, filterStato, filterServizio, filterTipo]);

  const revenue  = useMemo(() => buildForecast(visibleClients), [visibleClients]);
  const labels   = useMemo(() => buildLabels(), []);
  const trend    = useMemo(() => trendline(revenue), [revenue]);

  const totalMRR  = useMemo(() => visibleClients.reduce((s, c) => s + c.mrr, 0), [visibleClients]);
  const totalAnno = useMemo(() => revenue.reduce((a, b) => a + b, 0), [revenue]);
  const avgMese   = useMemo(() => Math.round(totalAnno / 12), [totalAnno]);
  const bestMese  = useMemo(() => Math.max(0, ...revenue), [revenue]);
  const trendDir  = trend[11] > trend[0];
  const nAttivi   = useMemo(() => visibleClients.filter(c => c.mrr > 0).length, [visibleClients]);

  const onMesiChange = (updated) =>
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '2rem 1.5rem' }}>

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

        <LABEL>servizio</LABEL>
        <button onClick={() => setFilterServizio(null)} style={pill(filterServizio === null, '#5b9cf6', 'rgba(91,156,246,0.08)')}>tutti</button>
        {allServizi.map(s => (
          <button key={s} onClick={() => setFilterServizio(s)} style={pill(filterServizio === s, '#5b9cf6', 'rgba(91,156,246,0.08)')}>{s}</button>
        ))}

        <SEP />

        <LABEL>tipo</LABEL>
        {[null, 'ricorrente', 'una tantum'].map(t => (
          <button key={t ?? '__all__'} onClick={() => setFilterTipo(t)}
            style={pill(filterTipo === t, '#f0924a', 'rgba(240,146,74,0.08)')}>
            {t ?? 'tutti'}
          </button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '10px', marginBottom: '1.25rem' }}>
        <MetricCard label="Clienti ricorrenti" value={nAttivi} sub={`di ${visibleClients.length} visualizzati`} />
        <MetricCard label="MRR" value={fmt(totalMRR)} sub="mensile ricorrente" />
        <MetricCard label="Media mensile" value={fmt(avgMese)} sub="proiezione 12 mesi" accent />
        <MetricCard label="Picco annuale" value={fmt(bestMese)} sub="mese migliore" />
        <MetricCard label="Totale annuo" value={fmt(totalAnno)} sub={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trendDir
              ? <TrendingUp size={11} color="var(--accent)" />
              : <TrendingDown size={11} color="var(--red)" />}
            <span>{trendDir ? 'trend positivo' : 'trend negativo'}</span>
          </span>
        } />
      </div>

      {/* ── Chart ── */}
      <div style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            proiezione ricavi — prossimi 12 mesi
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(200,240,74,0.25)', display: 'inline-block' }} />
              ricavi stimati
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '16px', borderTop: '2px dashed #f0924a', display: 'inline-block' }} />
              trend
            </span>
          </div>
        </div>
        <ForecastChart labels={labels} revenue={revenue} trend={trend} />
      </div>

      {/* ── Table ── */}
      <div style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '.875rem 1.25rem', borderBottom: '0.5px solid var(--border)',
        }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            clienti · {visibleClients.length} risultati
          </p>
          <p style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#444' }}>
            i mesi attivi aggiornano la proiezione
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
            caricamento da notion…
          </div>
        ) : visibleClients.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
            nessun cliente per i filtri selezionati
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['cliente', 'servizio', 'stato', 'mrr / mese', 'mesi attivi'].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', fontSize: '10px', fontFamily: 'var(--mono)',
                      letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)',
                      borderBottom: '0.5px solid var(--border)', textAlign: 'left', fontWeight: 400,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleClients.map(c => (
                  <ClientRow key={`${c.id}-${reloadKey}`} client={c} onChange={onMesiChange} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.12)' }}>
        swotstudios · dati notion in tempo reale
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
