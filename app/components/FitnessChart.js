'use client';

import { useEffect, useRef } from 'react';
import styles from './FitnessChart.module.css';

export default function FitnessChart({ history }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !history || history.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 20, right: 30, bottom: 30, left: 40 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    let animationFrame;
    const startTime = performance.now();
    const duration = 600; // ms animation

    function draw(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing out cubic
      const ease = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = '10px var(--font-mono)';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const val = (1 - i / 4).toFixed(1);
      const y = padding.top + (chartH / 4) * i;
      ctx.fillText(val, padding.left - 6, y + 3);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.floor(history.length / 8));
    for (let i = 0; i < history.length; i += step) {
      const x = padding.left + (i / Math.max(1, history.length - 1)) * chartW;
      ctx.fillText(`G${i}`, x, height - 8);
    }

    if (history.length < 2) return;

    const xScale = (i) => padding.left + (i / (history.length - 1)) * chartW;
    const yScale = (v) => padding.top + (1 - v) * chartH;

      const currentLength = Math.max(1, Math.floor(history.length * ease));
      const partialHistory = history.slice(0, currentLength);

      // Area fill for best fitness
      const bestGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      bestGrad.addColorStop(0, 'rgba(0, 255, 136, 0.15)');
      bestGrad.addColorStop(1, 'rgba(0, 255, 136, 0)');

      ctx.fillStyle = bestGrad;
      ctx.beginPath();
      ctx.moveTo(xScale(0), yScale(0));
      partialHistory.forEach((h, i) => ctx.lineTo(xScale(i), yScale(h.best)));
      ctx.lineTo(xScale(partialHistory.length - 1), yScale(0));
      ctx.closePath();
      ctx.fill();

      // Average line
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      partialHistory.forEach((h, i) => {
        if (i === 0) ctx.moveTo(xScale(i), yScale(h.average));
        else ctx.lineTo(xScale(i), yScale(h.average));
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Median line
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      partialHistory.forEach((h, i) => {
        if (i === 0) ctx.moveTo(xScale(i), yScale(h.median || h.average));
        else ctx.lineTo(xScale(i), yScale(h.median || h.average));
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Best fitness line
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 255, 136, 0.5)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      partialHistory.forEach((h, i) => {
        if (i === 0) ctx.moveTo(xScale(i), yScale(h.best));
        else ctx.lineTo(xScale(i), yScale(h.best));
      });
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Dots on best line
      partialHistory.forEach((h, i) => {
        const x = xScale(i);
        const y = yScale(h.best);
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Latest value label
      if (partialHistory.length > 0 && progress === 1) {
        const last = partialHistory[partialHistory.length - 1];
        const x = xScale(partialHistory.length - 1);
        const y = yScale(last.best);
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 11px var(--font-mono)';
        ctx.textAlign = 'left';
        ctx.fillText(last.best.toFixed(3), x + 8, y + 4);
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(draw);
      }
    }

    animationFrame = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animationFrame);
  }, [history]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>📈</span>
          Fitness Over Generations
        </h3>
        <div className={styles.legendInline}>
          <span className={styles.legendDot} style={{ background: '#00ff88' }} /> Best
          <span className={styles.legendDot} style={{ background: '#00d4ff' }} /> Avg
          <span className={styles.legendDot} style={{ background: '#8b5cf6' }} /> Median
        </div>
      </div>
      <div className={styles.chartWrapper}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {(!history || history.length === 0) && (
          <div className={styles.empty}>Waiting for data...</div>
        )}
      </div>
    </div>
  );
}
