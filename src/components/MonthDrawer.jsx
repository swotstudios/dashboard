import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { fmtLabel, fmt } from '../lib/forecast.js';

const TIPO_COLOR = {
  'MRR ricorrente': { color: '#c8f04a', bg: 'rgba(200,240,74,0.08)' },
  'Una tantum':     { color: '#f0924a', bg: 'rgba(240,146,74,0.08)' },
};

const STATO_COLOR = {
  'Incassata':    { color: '#c8f04a', bg: 'rgba(200,240,74,0.1)' },
  'Emessa':       { color: '#5b9cf6', bg: 'rgba(91,156,246,0.1)' },
  'Da emettere':  { color: '#f0924a', bg: 'rgba(240,146,74,0.1)' },
  'Previsionale': { color: '#6b6b6b', bg: 'rgba(255,255,255,0.05)' },
};

function Badge({ label, map }) {
  const c = map[label] || { color: '#6b6b6b', bg: 'rgba(255,255,255,0.05)' };
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '10px', fontWeight: 500, letterSpacing: '.03em',
      padding: '2px 8px', borderRadius: '4px', whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

export default function MonthDrawer({ ym, fatture, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const rows = fatture.filter(f => f.meseCompetenza === ym);
  const mrrRows = rows.filter(f => f.tipoVoce === 'MRR ricorrente');
  const utRows  = rows.filter(f => f.tipoVoce === 'Una tantum');
  const totalMrr = mrrRows.reduce((s, f) => s + f.importo, 0);
  const totalUt  = utRows.reduce((s, f) => s + f.importo, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 40,
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(480px, 95vw)',
        background: '#111',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg) 0 0 var(--radius-lg)',
        zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: '#444', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '3px' }}>
              dettaglio mese
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 400, letterSpacing: '-.02em' }}>
              {fmtLabel(ym)}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#555', padding: '4px', display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Summary totals */}
        <div style={{
          display: 'flex', gap: '1px',
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--border)',
        }}>
          <SummaryCell label="MRR ricorrente" value={fmt(totalMrr)} color="#c8f04a" />
          <SummaryCell label="Una tantum" value={fmt(totalUt)} color="#f0924a" />
          <SummaryCell label="Totale" value={fmt(totalMrr + totalUt)} color="#e8e6e0" />
        </div>

        {/* Rows */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 0' }}>
          {rows.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#444', fontFamily: 'var(--mono)', fontSize: '12px', padding: '2rem' }}>
              nessuna voce per questo mese
            </p>
          ) : (
            <>
              {mrrRows.length > 0 && (
                <Section title="MRR ricorrente" rows={mrrRows} />
              )}
              {utRows.length > 0 && (
                <Section title="Una tantum" rows={utRows} />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCell({ label, value, color }) {
  return (
    <div style={{
      flex: 1, background: '#111',
      padding: '10px 16px',
      display: 'flex', flexDirection: 'column', gap: '3px',
    }}>
      <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: '#444', letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: '15px', color }}>{value}</span>
    </div>
  );
}

function Section({ title, rows }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <p style={{
        fontSize: '9px', fontFamily: 'var(--mono)', color: '#444',
        letterSpacing: '.1em', textTransform: 'uppercase',
        padding: '6px 1.5rem', marginBottom: '2px',
      }}>{title}</p>
      {rows.map(f => <FatturaRow key={f.id} f={f} />)}
    </div>
  );
}

function FatturaRow({ f }) {
  return (
    <div style={{
      padding: '10px 1.5rem',
      borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Cliente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
          <span style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.cliente}
          </span>
          {f.notionUrl && (
            <a href={f.notionUrl} target="_blank" rel="noreferrer"
              style={{ color: '#444', display: 'flex', lineHeight: 1, flexShrink: 0 }}>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge label={f.stato ?? '—'} map={STATO_COLOR} />
          {f.servizi?.map(s => (
            <span key={s} style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--mono)' }}>{s}</span>
          ))}
        </div>
        {/* Note */}
        {f.note && (
          <p style={{ fontSize: '10px', color: '#555', fontFamily: 'var(--mono)', marginTop: '4px' }}>
            {f.note}
          </p>
        )}
      </div>
      {/* Importo */}
      <span style={{ fontFamily: 'var(--mono)', fontSize: '14px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {fmt(f.importo)}
      </span>
    </div>
  );
}
