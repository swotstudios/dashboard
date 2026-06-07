import React, { useState, useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { MESI, MESI_SHORT } from '../lib/forecast.js';
import { updateClient } from '../lib/notion.js';

const SERVICE_COLORS = {
  Adv:         { bg: 'rgba(91,156,246,0.12)', color: '#5b9cf6' },
  Social:      { bg: 'rgba(200,240,74,0.1)',  color: '#8faa2f' },
  'Sito Web':  { bg: 'rgba(255,255,255,0.05)', color: '#9b9b9b' },
  Landing:     { bg: 'rgba(255,255,255,0.05)', color: '#9b9b9b' },
  'E-Commerce':{ bg: 'rgba(240,146,74,0.12)', color: '#f0924a' },
};

function Tag({ label }) {
  const s = SERVICE_COLORS[label] || { bg: 'rgba(255,255,255,0.06)', color: '#9b9b9b' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: '10px', fontWeight: 500, letterSpacing: '.04em',
      padding: '2px 7px', borderRadius: '4px', display: 'inline-block',
    }}>{label}</span>
  );
}

export default function ClientRow({ client, onChange }) {
  const [mrr, setMrr]         = useState(client.mrr);
  const [mesi, setMesi]       = useState(client.mesiAttivi);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  const toggleMese = useCallback((mese) => {
    setMesi(prev => {
      const next = prev.includes(mese) ? prev.filter(m => m !== mese) : [...prev, mese];
      setDirty(true);
      return next;
    });
  }, []);

  const handleMrrChange = (v) => {
    setMrr(v);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateClient(client.id, { mrr: parseFloat(mrr) || 0, mesiAttivi: mesi });
      onChange({ ...client, mrr: parseFloat(mrr) || 0, mesiAttivi: mesi });
      setDirty(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const tdStyle = {
    padding: '10px 12px',
    borderBottom: '0.5px solid var(--border)',
    verticalAlign: 'middle',
  };

  return (
    <tr style={{ transition: 'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Nome */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 500, fontSize: '13px' }}>{client.nome}</span>
          <a href={client.notionUrl} target="_blank" rel="noreferrer"
            style={{ color: 'var(--muted)', display: 'flex', lineHeight: 1 }}>
            <ExternalLink size={11} />
          </a>
        </div>
      </td>

      {/* Servizi */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {client.servizi.map(s => <Tag key={s} label={s} />)}
        </div>
      </td>

      {/* MRR */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>€</span>
          <input
            type="number"
            value={mrr}
            onChange={e => handleMrrChange(e.target.value)}
            min="0"
            step="50"
            style={{
              width: '80px',
              background: 'var(--surface2)',
              border: '0.5px solid var(--border2)',
              borderRadius: 'var(--radius)',
              padding: '4px 8px',
              color: 'var(--text)',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
            }}
          />
        </div>
      </td>

      {/* Mesi Attivi */}
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
          {MESI.map((m, i) => {
            const active = mesi.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleMese(m)}
                title={m}
                style={{
                  width: '26px',
                  height: '22px',
                  borderRadius: '4px',
                  border: `0.5px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
                  background: active ? 'rgba(200,240,74,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  fontSize: '9px',
                  fontFamily: 'var(--mono)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all .1s',
                }}
              >
                {MESI_SHORT[i].slice(0, 1)}
              </button>
            );
          })}
        </div>
      </td>

      {/* Salva */}
      <td style={{ ...tdStyle, width: '60px', textAlign: 'right' }}>
        {dirty && (
          <button
            onClick={save}
            disabled={saving}
            style={{
              fontSize: '11px',
              fontFamily: 'var(--mono)',
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              border: '0.5px solid var(--accent)',
              color: 'var(--accent)',
              background: 'rgba(200,240,74,0.08)',
              cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? '...' : 'salva'}
          </button>
        )}
      </td>
    </tr>
  );
}
