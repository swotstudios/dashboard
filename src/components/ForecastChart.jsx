import React, { useEffect, useRef } from 'react';
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

function MrrChart({ labels, map, trend, yearSplit }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const axisLabels = labels.map(fmtLabel);
    const real    = labels.map(ym => map[ym]?.real    ?? 0);
    const proj100 = labels.map(ym => map[ym]?.proj100 ?? 0);
    const proj40  = labels.map(ym => map[ym]?.proj40  ?? 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: axisLabels,
        datasets: [
          {
            label: 'Reale',
            data: real,
            backgroundColor: 'rgba(200,240,74,0.75)',
            borderColor: '#c8f04a',
            borderWidth: 1,
            borderRadius: 3,
            order: 3,
          },
          {
            label: 'Proiettato 100%',
            data: proj100,
            backgroundColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200,240,74,0.22)' : 'rgba(91,156,246,0.30)'
            ),
            borderColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200,240,74,0.55)' : 'rgba(91,156,246,0.65)'
            ),
            borderWidth: 1,
            borderRadius: 3,
            order: 4,
          },
          {
            label: 'Proiettato 40%',
            data: proj40,
            backgroundColor: 'rgba(91,156,246,0.10)',
            borderColor: 'rgba(91,156,246,0.30)',
            borderWidth: 1,
            borderRadius: 3,
            order: 5,
          },
          {
            label: 'Trendline',
            data: trend,
            type: 'line',
            borderColor: '#f0924a',
            borderWidth: 2,
            borderDash: [4, 4],
            pointRadius: 0,
            tension: 0.4,
            fill: false,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              label: ctx => {
                const v = ctx.parsed.y;
                const f = '€' + Math.round(v).toLocaleString('it-IT');
                if (ctx.dataset.label === 'Reale')            return `reale: ${f}`;
                if (ctx.dataset.label === 'Proiettato 100%')  return `proiezione confermata: ${f}`;
                if (ctx.dataset.label === 'Proiettato 40%')   return `proiezione pesata 40%: ${f}`;
                if (ctx.dataset.label === 'Trendline')        return `trend: ${f}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, autoSkip: false, maxRotation: 45 },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, callback: v => '€' + v.toLocaleString('it-IT') },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, map, trend, yearSplit]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '260px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function UnatantumChart({ labels, utMap }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();

    const data = labels.map(ym => {
      const b = utMap[ym];
      return b ? b.real + b.proj100 + b.proj40 : 0;
    });
    if (data.every(v => v === 0)) return; // nothing to show

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: labels.map(fmtLabel),
        datasets: [{
          label: 'Una tantum',
          data,
          backgroundColor: 'rgba(240,146,74,0.30)',
          borderColor: '#f0924a',
          borderWidth: 1,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1c1c1c',
            borderColor: 'rgba(255,255,255,0.08)',
            borderWidth: 1,
            titleColor: '#6b6b6b',
            bodyColor: '#e8e6e0',
            padding: 10,
            callbacks: {
              label: ctx => `una tantum: €${Math.round(ctx.parsed.y).toLocaleString('it-IT')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, autoSkip: false, maxRotation: 45 },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: { ...TICK_STYLE, callback: v => '€' + v.toLocaleString('it-IT') },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, utMap]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '120px' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function ForecastChart({ labels, map, utMap, trend, yearSplit }) {
  const hasUnatantum = labels.some(ym => {
    const b = utMap?.[ym];
    return b && (b.real + b.proj100 + b.proj40) > 0;
  });

  const surface = { background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ── MRR chart ── */}
      <div style={surface}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            mrr ricorrente
          </p>
          <div style={{ display: 'flex', gap: '14px', fontSize: '10px', color: 'var(--muted)', fontFamily: 'var(--mono)', flexWrap: 'wrap' }}>
            <LegendDot color="rgba(200,240,74,0.8)" label="reale" />
            <LegendDot color="rgba(200,240,74,0.22)" border="rgba(200,240,74,0.6)" label="proiettato 100%" />
            <LegendDot color="rgba(91,156,246,0.10)" border="rgba(91,156,246,0.30)" label="proiettato 40%" />
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '16px', borderTop: '2px dashed #f0924a', display: 'inline-block' }} />
              trend
            </span>
          </div>
        </div>
        <MrrChart labels={labels} map={map} trend={trend} yearSplit={yearSplit} />
      </div>

      {/* ── Una tantum mini-chart ── */}
      {hasUnatantum && (
        <div style={surface}>
          <p style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            extra / una tantum
          </p>
          <UnatantumChart labels={labels} utMap={utMap} />
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{
        width: '10px', height: '10px', borderRadius: '2px',
        background: color,
        border: border ? `0.5px solid ${border}` : 'none',
        display: 'inline-block',
      }} />
      {label}
    </span>
  );
}
