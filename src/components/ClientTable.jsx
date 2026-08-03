import React from 'react';
import { ExternalLink } from 'lucide-react';
import { fmtLabel, fmt } from '../lib/forecast.js';

const STATO_COLOR = {
  'In corso':              { color: '#c8f04a', bg: 'rgba(200,240,74,0.1)' },
  'Pagato':                { color: '#c8f04a', bg: 'rgba(200,240,74,0.1)' },
  'Da iniziare':           { color: '#5b9cf6', bg: 'rgba(91,156,246,0.1)' },
  'Da Pagare':             { color: '#f0924a', bg: 'rgba(240,146,74,0.1)' },
  'In attesa di risposta': { color: '#9b9b9b', bg: 'rgba(255,255,255,0.05)' },
  'Da preventivare':       { color: '#9b9b9b', bg: 'rgba(255,255,255,0.05)' },
  'Terminato':             { color: '#444',    bg: 'rgba(255,255,255,0.03)' },
  'Perso':                 { color: '#e05252', bg: 'rgba(224,82,82,0.08)' },
  'Rifiutato':             { color: '#e05252', bg: 'rgba(224,82,82,0.08)' },
};

const SERVICE_COLORS = {
  Adv:          { bg: 'rgba(91,156,246,0.12)',  color: '#5b9cf6' },
  Social:       { bg: 'rgba(200,240,74,0.1)',   color: '#8faa2f' },
  'Sito Web':   { bg: 'rgba(255,255,255,0.05)', color: '#9b9b9b' },
  Landing:      { bg: 'rgba(255,255,255,0.05)', color: '#9b9b9b' },
  'E-Commerce': { bg: 'rgba(240,146,74,0.12)',  color: '#f0924a' },
};

function Tag({ label }) {
  const s = SERVICE_COLORS[label] || { bg: 'rgba(255,255,255,0.06)', color: '#6b6b6b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '10px', fontWeight: 500, letterSpacing: '.04em',
      padding: '2px 7px', borderRadius: '4px', display: 'inline-block',
    }}>{label}</span>
  );
}

function StatoBadge({ stati }) {
  if (!stati?.length) return <span style={{ color: '#444', fontSize: '11px' }}>-</span>;
  const s = stati[0];
  const c = STATO_COLOR[s] || { color: '#6b6b6b', bg: 'rgba(255,255,255,0.05)' };
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '10px', fontWeight: 500, letterSpacing: '.03em',
      padding: '2px 8px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap',
    }}>{s}</span>
  );
}

// Dot indicator: green=100%, yellow=40%, grey=missing
function PesoDot({ peso, importo, ym, stato }) {
  const color = peso >= 1 ? '#c8f04a' : peso > 0 ? '#f0c94a' : '#333';
  const label = fmtLabel(ym);
  const tip = peso === 0
    ? `${label}: nessuna riga`
    : `${label}: ${fmt(importo)} (${stato ?? 'reale'})`;
  return (
    <span title={tip} style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)',
      marginRight: '8px',
    }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      {peso > 0 ? fmt(importo) : '—'}
    </span>
  );
}

export default function ClientTable({ summaries, loading }) {
  const td = {
    padding: '10px 12px',
    borderBottom: '0.5px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '.875rem 1.25rem', borderBottom: '0.5px solid var(--border)',
      }}>
        <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          clienti · {summaries.length} risultati
        </p>
        <p style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#444' }}>
          solo lettura · fonte: notion / fatture
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
          caricamento da notion…
        </div>
      ) : summaries.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>
          nessun cliente per i filtri selezionati
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['cliente', 'servizio', 'stato', 'mrr corrente', 'prossimi 3 mesi'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px', fontSize: '10px', fontFamily: 'var(--mono)',
                    letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--muted)',
                    borderBottom: '0.5px solid var(--border)', textAlign: 'left', fontWeight: 400,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map(c => (
                <tr key={c.cliente}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background .12s' }}
                >
                  {/* Cliente */}
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 500, fontSize: '13px' }}>{c.cliente}</span>
                      {c.notionUrl && (
                        <a href={c.notionUrl} target="_blank" rel="noreferrer"
                          style={{ color: 'var(--muted)', display: 'flex', lineHeight: 1, opacity: .45 }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Servizi */}
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {c.servizi.length
                        ? c.servizi.map(s => <Tag key={s} label={s} />)
                        : <span style={{ color: '#444', fontSize: '11px' }}>-</span>}
                    </div>
                  </td>

                  {/* Stato */}
                  <td style={td}><StatoBadge stati={c.statoLavori} /></td>

                  {/* MRR corrente */}
                  <td style={td}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: '13px',
                      color: c.mrrCorrente > 0 ? 'var(--text)' : '#444',
                    }}>
                      {c.mrrCorrente > 0 ? fmt(c.mrrCorrente) : '—'}
                    </span>
                  </td>

                  {/* Prossimi 3 mesi */}
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {c.prossimi3.map(m => (
                        <PesoDot key={m.ym} {...m} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
