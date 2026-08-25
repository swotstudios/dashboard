import React, { useEffect, useRef, useState } from 'react';
import {
  Chart, BarController, LineController,
  BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import { fmtLabel } from '../lib/forecast.js';

Chart.register(
  BarController, LineController,
  BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
);

const TICK_STYLE = { color: '#6b6b6b', font: { family: "'DM Mono', monospace", size: 10 } };

const pill = (active) => ({
  fontSize: '10px', fontFamily: 'var(--mono)',
  padding: '2px 10px', borderRadius: '20px',
  border: `0.5px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
  color: active ? '#e8e6e0' : '#555',
  background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
  cursor: 'pointer', transition: 'all .1s',
});

function LegendDot({ color, border, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{
        width: '10px', height: '10px', borderRadius: '2px',
        background: color,
        border: border ? `0.5px solid ${border}` : 'none',
        display: 'inline-block', flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

/**
 * Props:
 *  labels       – ['YYYY-MM', ...]
 *  map          – { 'YYYY-MM': { real, proj100, proj40 } }  (MRR)
 *  utMap        – { 'YYYY-MM': { real, proj100, proj40 } }  (Una tantum)
 *  trend        – number[] based on MRR real+proj100
 *  yearSplit    – number of labels in current year
 *  onMonthClick – (ym: string) => void
 */
export default function ForecastChart({ labels, map, utMap, trend, yearSplit, onMonthClick }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const [view, setView] = useState('tutti'); // 'tutti' | 'mrr' | 'unatantum'

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const axisLabels = labels.map(fmtLabel);
    const showMrr = view !== 'unatantum';
    const showUt  = view !== 'mrr';

    const mrrReal    = labels.map(ym => showMrr ? (map[ym]?.real    ?? 0) : 0);
    const mrrProj100 = labels.map(ym => showMrr ? (map[ym]?.proj100 ?? 0) : 0);
    const mrrProj40  = labels.map(ym => showMrr ? (map[ym]?.proj40  ?? 0) : 0);
    const utTotal    = labels.map(ym => showUt  ? ((utMap[ym]?.real ?? 0) + (utMap[ym]?.proj100 ?? 0) + (utMap[ym]?.proj40 ?? 0)) : 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: axisLabels,
        datasets: [
          {
            label: 'MRR reale',
            data: mrrReal,
            backgroundColor: 'rgba(200,240,74,0.75)',
            borderColor: '#c8f04a',
            borderWidth: 1,
            borderRadius: 3,
            stack: 'revenue',
            order: 4,
          },
          {
            label: 'MRR proiettato',
            data: mrrProj100,
            backgroundColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200,240,74,0.22)' : 'rgba(91,156,246,0.30)'
            ),
            borderColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200,240,74,0.55)' : 'rgba(91,156,246,0.65)'
            ),
            borderWidth: 1,
            borderRadius: 3,
            stack: 'revenue',
            order: 5,
          },
          {
            label: 'MRR previsionale (40%)',
            data: mrrProj40,
            backgroundColor: 'rgba(91,156,246,0.10)',
            borderColor: 'rgba(91,156,246,0.28)',
            borderWidth: 1,
            borderRadius: 3,
            stack: 'revenue',
            order: 6,
          },
          {
            label: 'Una tantum',
            data: utTotal,
            backgroundColor: 'rgba(240,146,74,0.40)',
            borderColor: '#f0924a',
            borderWidth: 1,
            borderRadius: 3,
            stack: 'revenue',
            order: 7,
          },
          {
            label: 'Trendline',
            data: showMrr ? trend : [],
            type: 'line',
            borderColor: '#f0924a',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            tension: 0.4,
            fill: false,
            stack: undefined,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt, elements) => {
          if (!elements.length) return;
          const idx = elements[0].index;
          onMonthClick?.(labels[idx]);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c1c1c',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#6b6b6b',
            bodyColor: '#e8e6e0',
            padding: 10,
            filter: item => item.parsed.y !== 0,
            callbacks: {
              title: ([ctx]) => `${ctx.label} — clicca per i dettagli`,
              label: ctx => {
                const v = ctx.parsed.y;
                const f = '€' + Math.round(v).toLocaleString('it-IT');
                if (ctx.dataset.label === 'MRR reale')              return `MRR reale: ${f}`;
                if (ctx.dataset.label === 'MRR proiettato')         return `MRR proiettato: ${f}`;
                if (ctx.dataset.label === 'MRR previsionale (40%)') return `MRR previsionale (40%): ${f}`;
                if (ctx.dataset.label === 'Una tantum')             return `Una tantum: ${f}`;
                if (ctx.dataset.label === 'Trendline')              return `trend: ${f}`;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, autoSkip: false, maxRotation: 45 },
          },
          y: {
            stacked: true,
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, callback: v => '€' + v.toLocaleString('it-IT') },
          },
        },
        // pointer cursor on hover
        onHover: (evt, elements) => {
          evt.native.target.style.cursor = elements.length ? 'pointer' : 'default';
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, map, utMap, trend, yearSplit, view, onMonthClick]);

  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            ricavi mensili
          </p>
          {/* View filter */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {[['tutti', 'tutti'], ['mrr', 'mrr'], ['unatantum', 'una tantum']].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)} style={pill(view === k)}>{label}</button>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)', flexWrap: 'wrap' }}>
          {view !== 'unatantum' && <>
            <LegendDot color="rgba(200,240,74,0.8)" label="mrr reale" />
            <LegendDot color="rgba(200,240,74,0.22)" border="rgba(200,240,74,0.6)" label="proiettato" />
            <LegendDot color="rgba(91,156,246,0.10)" border="rgba(91,156,246,0.28)" label="previsionale 40%" />
          </>}
          {view !== 'mrr' && <LegendDot color="rgba(240,146,74,0.4)" border="#f0924a" label="una tantum" />}
          {view !== 'unatantum' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '16px', borderTop: '2px dashed #f0924a', display: 'inline-block' }} />
              trend
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '280px' }}>
        <canvas ref={canvasRef} />
      </div>
      <p style={{ textAlign: 'center', fontSize: '10px', fontFamily: 'var(--mono)', color: '#444', marginTop: '8px' }}>
        clicca su un mese per vedere le voci
      </p>
    </div>
  );
}
