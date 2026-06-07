import React from 'react';

export default function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `0.5px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
    }}>
      <p style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </p>
      <p style={{
        fontSize: '24px',
        fontWeight: 500,
        fontFamily: 'var(--mono)',
        color: accent ? 'var(--accent)' : 'var(--text)',
        letterSpacing: '-.02em',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{sub}</p>
      )}
    </div>
  );
}
