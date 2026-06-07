import React, { useEffect, useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import MetricCard from './components/MetricCard.jsx';
import ForecastChart from './components/ForecastChart.jsx';
import ClientRow from './components/ClientRow.jsx';
import { fetchClients } from './lib/notion.js';
import { buildForecast, buildLabels, trendline, fmt, MESI } from './lib/forecast.js';

const STATO_ATTIVO = new Set(['In corso', 'Da iniziare', 'Da Pagare', 'In attesa di risposta']);

export default function App() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]         = useState('attivi'); // 'tutti' | 'attivi'
  const [servicioFilter, setServicioFilter] = useState(null); // null = tutti i servizi

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setClients(data);
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
    let list = filter === 'attivi'
      ? clients.filter(c => c.stato.some(s => STATO_ATTIVO.has(s)))
      : clients;
    if (servicioFilter) list = list.filter(c => c.servizi.includes(servicioFilter));
    return list;
  }, [clients, filter, servicioFilter]);

  const revenue  = useMemo(() => buildForecast(visibleClients), [visibleClients]);
  const labels   = useMemo(() => buildLabels(), []);
  const trend    = useMemo(() => trendline(revenue), [revenue]);

  const totalMRR   = useMemo(() => visibleClients.reduce((s, c) => s + c.mrr, 0), [visibleClients]);
  const totalAnno  = useMemo(() => revenue.reduce((a, b) => a + b, 0), [revenue]);
  const avgMese    = useMemo(() => Math.round(totalAnno / 12), [totalAnno]);
  const bestMese   = useMemo(() => Math.max(0, ...revenue), [revenue]);
  const trendDir   = trend[11] > trend[0];

  const updateClient = (updated) => {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const th = {
    padding: '8px 12px',
    fontSize: '10px',
    fontFamily: 'var(--mono)',
    letterSpacing: '.06em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    borderBottom: '0.5px solid var(--border)',
    textAlign: 'left',
    fontWeight: 400,
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.1em', marginBottom: '4px' }}>
            SWOTSTUDIOS
          </p>
          <h1 style={{ fontSize: '22px', fontWeight: 400, letterSpacing: '-.02em' }}>
            revenue dashboard
          </h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontFamily: 'var(--mono)',
            color: 'var(--muted)',
            padding: '6px 12px',
            border: '0.5px solid var(--border2)',
            borderRadius: 'var(--radius)',
            background: 'transparent',
            cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          aggiorna
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(224,82,82,0.1)', border: '0.5px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '.75rem 1rem',
          color: 'var(--red)', fontSize: '12px', fontFamily: 'var(--mono)',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginBottom: '1.5rem',
      }}>
        <MetricCard label="Clienti attivi" value={visibleClients.filter(c => c.mrr > 0).length} sub={`di ${clients.length} totali`} />
        <MetricCard label="MRR base" value={fmt(totalMRR)} sub="somma mensile" />
        <MetricCard label="Media mensile" value={fmt(avgMese)} sub="12 mesi rolling" accent />
        <MetricCard label="Mese migliore" value={fmt(bestMese)} sub="picco annuale" />
        <MetricCard label="Totale annuo" value={fmt(totalAnno)} sub={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trendDir
              ? <TrendingUp size={11} color="var(--accent)" />
              : <TrendingDown size={11} color="var(--red)" />
            }
            <span>{trendDir ? 'trend crescente' : 'trend calante'}</span>
          </span>
        } />
      </div>

      {/* Chart */}
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            proiezione — prossimi 12 mesi
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(200,240,74,0.3)', display: 'inline-block' }}></span>
              stimato
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '16px', height: '2px', background: '#f0924a', display: 'inline-block', borderTop: '2px dashed #f0924a' }}></span>
              trend
            </span>
          </div>
        </div>
        <ForecastChart labels={labels} revenue={revenue} trend={trend} />
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            clienti &amp; mesi attivi
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['attivi', 'tutti'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: '11px', fontFamily: 'var(--mono)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius)',
                  border: `0.5px solid ${filter === f ? 'var(--accent)' : 'var(--border2)'}`,
                  color: filter === f ? 'var(--accent)' : 'var(--muted)',
                  background: filter === f ? 'rgba(200,240,74,0.08)' : 'transparent',
                  cursor: 'pointer',
                }}
              >{f}</button>
            ))}
            {allServizi.length > 0 && (
              <>
                <span style={{ width: '0.5px', background: 'var(--border2)', margin: '2px 2px' }} />
                {[null, ...allServizi].map(s => (
                  <button
                    key={s ?? '__all__'}
                    onClick={() => setServicioFilter(s)}
                    style={{
                      fontSize: '11px', fontFamily: 'var(--mono)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius)',
                      border: `0.5px solid ${servicioFilter === s ? 'var(--blue)' : 'var(--border2)'}`,
                      color: servicioFilter === s ? 'var(--blue)' : 'var(--muted)',
                      background: servicioFilter === s ? 'rgba(91,156,246,0.08)' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >{s ?? 'tutti i servizi'}</button>
                ))}
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
            caricamento da notion...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: '180px' }}>cliente</th>
                  <th style={{ ...th, width: '130px' }}>servizio</th>
                  <th style={{ ...th, width: '120px' }}>MRR (€)</th>
                  <th style={th}>mesi attivi</th>
                  <th style={{ ...th, width: '70px' }}></th>
                </tr>
              </thead>
              <tbody>
                {visibleClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
                      nessun cliente trovato
                    </td>
                  </tr>
                ) : (
                  visibleClients.map(c => (
                    <ClientRow key={c.id} client={c} onChange={updateClient} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
        swotstudios dashboard — dati da notion in tempo reale
      </p>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
