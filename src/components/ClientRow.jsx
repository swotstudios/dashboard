import React, { useState, useCallback, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { MESI, MESI_SHORT } from '../lib/forecast.js';
import { updateClient } from '../lib/notion.js';

const STATO_COLOR = {
  'In corso':              { color: '#c8f04a', bg: 'rgba(200,240,74,0.1)' },
  'Da iniziare':           { color: '#5b9cf6', bg: 'rgba(91,156,246,0.1)' },
  'Da Pagare':             { color: '#f0924a', bg: 'rgba(240,146,74,0.1)' },
  'In attesa di risposta': { color: '#9b9b9b', bg: 'rgba(255,255,255,0.05)' },
  'Terminato':             { color: '#444',    bg: 'rgba(255,255,255,0.03)' },
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

export default function ClientRow({ client, onChange }) {
  const [mrr, setMrr]         = useState(client.mrr);
  const [mesi, setMesi]       = useState(client.mesiAttivi);
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState(false);
  const mesiTimer = useRef(null);

  // Called with the full patch to send to Notion
  const doSave = useCallback(async (patch) => {
    setSaving(true);
    setSaveErr(false);
    try {
      await updateClient(client.id, patch);
      onChange({ ...client, ...patch });
    } catch (e) {
      console.error('save error', e);
      setSaveErr(true);
    } finally {
      setSaving(false);
    }
  }, [client.id]); // stable: only depends on the page id

  // MRR: save on blur (when user leaves the field)
  const handleMrrBlur = () => {
    const val = parseFloat(mrr) || 0;
    doSave({ mrr: val, mesiAttivi: mesi });
  };

  // Mesi: save 700ms after last toggle
  const toggleMese = (mese) => {
    setMesi(prev => {
      const next = prev.includes(mese)
        ? prev.filter(m => m !== mese)
        : [...prev, mese];
      clearTimeout(mesiTimer.current);
      mesiTimer.current = setTimeout(() => {
        doSave({ mrr: parseFloat(mrr) || 0, mesiAttivi: next });
      }, 700);
      return next;
    });
  };

  const td = { padding: '10px 12px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle' };

  return (
    <tr
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      style={{ transition: 'background .12s' }}
    >
      {/* Nome */}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 500, fontSize: '13px' }}>{client.nome}</span>
          <a href={client.notionUrl} target="_blank" rel="noreferrer"
            style={{ color: 'var(--muted)', display: 'flex', lineHeight: 1, opacity: .5 }}>
            <ExternalLink size={11} />
          </a>
        </div>
      </td>

      {/* Servizi */}
      <td style={td}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {client.servizi.length
            ? client.servizi.map(s => <Tag key={s} label={s} />)
            : <span style={{ color: '#444', fontSize: '11px' }}>-</span>}
        </div>
      </td>

      {/* Stato */}
      <td style={td}>
        <StatoBadge stati={client.stato} />
      </td>

      {/* MRR — editabile, salva su blur */}
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>EUR</span>
            <input
              type="number"
              value={mrr}
              onChange={e => setMrr(e.target.value)}
              onBlur={handleMrrBlur}
              onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
              min="0"
              step="50"
              placeholder="0"
              style={{
                width: '80px',
                background: saveErr ? 'rgba(224,82,82,0.08)' : 'var(--surface2)',
                border: `0.5px solid ${saveErr ? 'var(--red)' : 'var(--border2)'}`,
                borderRadius: 'var(--radius)',
                padding: '4px 8px',
                color: 'var(--text)',
                fontFamily: 'var(--mono)',
                fontSize: '13px',
              }}
            />
          </div>
          {saving && (
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>...</span>
          )}
          {saveErr && !saving && (
            <span style={{ fontSize: '10px', fontFamily: 'var(--mono)', color: 'var(--red)' }}>err</span>
          )}
        </div>
      </td>

      {/* Mesi Attivi — toggleable, auto-save */}
      <td style={td}>
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' }}>
          {MESI.map((m, i) => {
            const active = mesi.includes(m);
            return (
              <button key={m} onClick={() => toggleMese(m)} title={m} style={{
                width: '24px', height: '20px', borderRadius: '3px',
                border: `0.5px solid ${active ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
                background: active ? 'rgba(200,240,74,0.12)' : 'transparent',
                color: active ? 'var(--accent)' : 'rgba(255,255,255,0.18)',
                fontSize: '8px', fontFamily: 'var(--mono)', fontWeight: 600,
                cursor: 'pointer', transition: 'all .1s',
              }}>
                {MESI_SHORT[i][0]}
              </button>
            );
          })}
        </div>
      </td>
    </tr>
  );
}
