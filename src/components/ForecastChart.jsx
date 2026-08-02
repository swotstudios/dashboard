import React, { useEffect, useRef } from 'react';
import {
  Chart, BarController, LineController,
  BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';

Chart.register(BarController, LineController, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ForecastChart({ labels, revenue, trend, yearSplit = 0 }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    // Different colors for current year vs next year bars
    const bgColors = revenue.map((_, i) =>
      i < yearSplit ? 'rgba(200, 240, 74, 0.18)' : 'rgba(91, 156, 246, 0.18)'
    );
    const borderColors = revenue.map((_, i) =>
      i < yearSplit ? '#c8f04a' : '#5b9cf6'
    );

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Fatturato stimato',
            data: revenue,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 4,
            order: 2,
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
                if (ctx.dataset.label === 'Trendline') return `trend: €${ctx.parsed.y.toLocaleString('it-IT')}`;
                return `stimato: €${ctx.parsed.y.toLocaleString('it-IT')}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { color: 'rgba(255,255,255,0.06)' },
            ticks: {
              color: '#6b6b6b',
              font: { family: "'DM Mono', monospace", size: 11 },
              autoSkip: false,
              maxRotation: 45,
            },
          },
          y: {
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
  }, [labels, revenue, trend]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '260px' }}>
      <canvas ref={canvasRef} role="img" aria-label="Grafico proiezione fatturato per anno" />
    </div>
  );
}
