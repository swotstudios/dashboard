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

/**
 * Props:
 *  labels    – ['YYYY-MM', ...]
 *  map       – { 'YYYY-MM': { real, proj100, proj40, unatantum } }
 *  trend     – number[]  (same length as labels)
 *  yearSplit – number of labels that belong to current year
 */
export default function ForecastChart({ labels, map, trend, yearSplit }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const axisLabels = labels.map(fmtLabel);
    const real     = labels.map(ym => map[ym]?.real     ?? 0);
    const proj100  = labels.map(ym => map[ym]?.proj100  ?? 0);
    const proj40   = labels.map(ym => map[ym]?.proj40   ?? 0);

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels: axisLabels,
        datasets: [
          {
            label: 'Reale',
            data: real,
            backgroundColor: 'rgba(200, 240, 74, 0.75)',
            borderColor: '#c8f04a',
            borderWidth: 1,
            borderRadius: 3,
            order: 3,
          },
          {
            label: 'Proiettato 100%',
            data: proj100,
            backgroundColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200, 240, 74, 0.22)' : 'rgba(91, 156, 246, 0.30)'
            ),
            borderColor: labels.map((_, i) =>
              i < yearSplit ? 'rgba(200, 240, 74, 0.6)' : 'rgba(91, 156, 246, 0.7)'
            ),
            borderWidth: 1,
            borderRadius: 3,
            order: 4,
          },
          {
            label: 'Proiettato 40%',
            data: proj40,
            backgroundColor: 'rgba(91, 156, 246, 0.12)',
            borderColor: 'rgba(91, 156, 246, 0.35)',
            borderWidth: 1,
            borderDash: [3, 3],
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
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed.y;
                if (!v) return null;
                const f = '€' + Math.round(v).toLocaleString('it-IT');
                if (ctx.dataset.label === 'Reale')           return `reale: ${f}`;
                if (ctx.dataset.label === 'Proiettato 100%') return `proiezione 100%: ${f}`;
                if (ctx.dataset.label === 'Proiettato 40%')  return `proiezione pesata 40%: ${f}`;
                if (ctx.dataset.label === 'Trendline')       return `trend: ${f}`;
                return null;
              },
            },
          },
        },
        scales: {
          x: {
            stacked: false,
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#6b6b6b',
              font: { family: "'DM Mono', monospace", size: 10 },
              autoSkip: false,
              maxRotation: 45,
            },
          },
          y: {
            stacked: false,
            grid: { color: 'rgba(255,255,255,0.04)' },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#6b6b6b',
              font: { family: "'DM Mono', monospace", size: 11 },
              callback: (v) => '€' + v.toLocaleString('it-IT'),
            },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [labels, map, trend, yearSplit]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '280px' }}>
      <canvas ref={canvasRef} role="img" aria-label="Grafico proiezione fatturato mensile" />
    </div>
  );
}
