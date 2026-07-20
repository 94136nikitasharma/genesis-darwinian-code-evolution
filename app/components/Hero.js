'use client';

import { useEffect, useRef } from 'react';
import styles from './Hero.module.css';

export default function Hero({ onStart }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let time = 0;

    function resize() {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    // Particles representing code organisms
    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      hue: Math.random() * 60 + 120, // green-cyan range
      pulse: Math.random() * Math.PI * 2,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      time += 0.005;

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15;
            ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw & update particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        // Bounce off edges
        if (p.x < 0 || p.x > canvas.offsetWidth) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.offsetHeight) p.vy *= -1;

        const glow = 0.4 + Math.sin(p.pulse) * 0.3;
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${glow})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + Math.sin(p.pulse) * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow
        ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${glow * 0.2})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // DNA helix in center
      drawDNAHelix(ctx, canvas.offsetWidth / 2, canvas.offsetHeight / 2, time);

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section className={styles.hero}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.content}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Powered by OpenAI gpt-4o-mini
        </div>
        <h1 className={styles.title}>
          Don&apos;t generate code.<br/>
          <span className={styles.titleAccent}>Evolve it.</span>
        </h1>
        <p className={styles.description}>
          GENESIS applies Darwinian evolution to software. OpenAI gpt-4o-mini generates mutations while the evolution engine performs selection, crossover, benchmarking, and survival to explore competing programs and retain higher-scoring candidates.
        </p>
        <div className={styles.actions}>
          <div className={styles.ctaWrapper}>
            <button className={`${styles.ctaButton} btn btn-primary btn-lg`} onClick={onStart} id="start-evolution-btn">
              <span className={styles.ctaGlow}></span>
              <span className={styles.ctaContent}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z"/>
                  <path d="M8 12c0-2.2 1.8-4 4-4M16 12c0 2.2-1.8 4-4 4"/>
                  <circle cx="12" cy="12" r="1.5"/>
                </svg>
                Begin Evolution
              </span>
            </button>
          </div>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>∞</span>
            <span className={styles.statLabel}>Possible Solutions</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>AI</span>
            <span className={styles.statLabel}>Mutation Engine</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>🧬</span>
            <span className={styles.statLabel}>Darwinian Selection</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function drawDNAHelix(ctx, cx, cy, time) {
  const points = 30;
  const height = 200;
  const width = 40;

  for (let i = 0; i < points; i++) {
    const t = i / points;
    const y = cy - height / 2 + t * height;
    const phase = t * Math.PI * 4 + time * 3;

    const x1 = cx + Math.sin(phase) * width;
    const x2 = cx + Math.sin(phase + Math.PI) * width;

    const z1 = Math.cos(phase);
    const z2 = Math.cos(phase + Math.PI);

    const alpha1 = 0.08 + (z1 + 1) * 0.06;
    const alpha2 = 0.08 + (z2 + 1) * 0.06;

    // Connecting rungs
    if (i % 3 === 0) {
      ctx.strokeStyle = `rgba(0, 212, 255, ${(alpha1 + alpha2) / 2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }

    // Strand 1
    ctx.fillStyle = `rgba(0, 255, 136, ${alpha1})`;
    ctx.beginPath();
    ctx.arc(x1, y, 2 + z1, 0, Math.PI * 2);
    ctx.fill();

    // Strand 2
    ctx.fillStyle = `rgba(139, 92, 246, ${alpha2})`;
    ctx.beginPath();
    ctx.arc(x2, y, 2 + z2, 0, Math.PI * 2);
    ctx.fill();
  }
}
