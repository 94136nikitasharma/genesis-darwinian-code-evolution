'use client';

import styles from './CodeViewer.module.css';

export default function CodeViewer({ organism, onClose }) {
  if (!organism) return null;

  const fitnessPercent = ((organism.fitness || 0) * 100).toFixed(1);
  const correctnessPercent = ((organism.correctness || 0) * 100).toFixed(0);
  const medianRuntime = organism.evalDetails?.perfMetrics?.median;
  const performancePercent = ((organism.performance || 0) * 100).toFixed(1);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            <span className={styles.titleIcon}>🧬</span>
            Organism Inspector
          </h3>
          <div className={styles.badges}>
            <span className={`badge ${organism.correctness === 1 ? 'badge-green' : organism.correctness >= 0.5 ? 'badge-blue' : 'badge-purple'}`}>
              {correctnessPercent}% correct
            </span>
            {organism.operation && (
              <span className="badge badge-blue">
                {organism.operation === 'elite' ? '👑 Elite' :
                 organism.operation === 'mutation' ? '⚡ Mutated' :
                 organism.operation === 'crossover' ? '🧬 Crossover' :
                 organism.operation === 'novel' ? '✨ Novel' : organism.operation}
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close inspector">
            ✕
          </button>
        )}
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Fitness</div>
          <div className={styles.metricValue}>{fitnessPercent}%</div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricFill}
              style={{
                width: `${fitnessPercent}%`,
                background: organism.fitness >= 0.8 ? 'var(--accent-primary)' :
                             organism.fitness >= 0.5 ? 'var(--accent-warning)' : 'var(--accent-danger)',
              }}
            />
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Correctness</div>
          <div className={styles.metricValue}>{correctnessPercent}%</div>
          <div className={styles.metricBar}>
            <div
              className={styles.metricFill}
              style={{
                width: `${correctnessPercent}%`,
                background: organism.correctness === 1 ? 'var(--accent-primary)' : 'var(--accent-secondary)',
              }}
            />
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Generation</div>
          <div className={styles.metricValue}>{organism.generation}</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Median Runtime</div>
          <div className={styles.metricValue}>{medianRuntime != null ? `${medianRuntime.toFixed(3)}ms` : '—'}</div>
          <div className={styles.metricNote}>
            {organism.evalDetails?.perfMetrics?.verified ? 'Verified benchmark' : 'No verified benchmark'}
          </div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricLabel}>Performance</div>
          <div className={styles.metricValue}>{performancePercent}%</div>
        </div>
      </div>

      <div className={styles.codeSection}>
        <div className={styles.codeSectionHeader}>
          <span>Source Code</span>
          <button
            className="btn btn-ghost"
            onClick={() => navigator.clipboard?.writeText(organism.code)}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            📋 Copy
          </button>
        </div>
        <pre className={styles.code}>
          <code>{highlightJS(organism.code || '')}</code>
        </pre>
      </div>

      {organism.evalDetails?.details && organism.evalDetails.details.length > 0 && (
        <div className={styles.testsSection}>
          <div className={styles.codeSectionHeader}>
            <span>Test Results</span>
            <span className={styles.testCount}>
              {organism.evalDetails.testsPass}/{organism.evalDetails.totalTests} passed
            </span>
          </div>
          <div className={styles.testsList}>
            {organism.evalDetails.details.map((test, i) => (
              <div key={i} className={`${styles.testRow} ${test.correct ? styles.testPass : styles.testFail}`}>
                <span className={styles.testIcon}>{test.correct ? '✅' : '❌'}</span>
                <div className={styles.testContent}>
                  <span className={styles.testInput}>Input: {test.input}</span>
                  {!test.correct && (
                    <span className={styles.testExpected}>Expected: {test.expected} | Got: {test.got}</span>
                  )}
                </div>
                <span className={styles.testTime}>{test.time.toFixed(1)}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function highlightJS(code) {
  // Simple syntax highlighting — returns JSX-safe string
  return code
    .replace(/\/\/.*/g, match => `\x1BCOMMENT${match}\x1BEND`)
    .replace(/\b(function|return|if|else|for|while|let|const|var|new|typeof|break|continue|switch|case|default|do|throw|try|catch|finally)\b/g, '\x1BKEYWORD$1\x1BEND')
    .replace(/\b(\d+\.?\d*)\b/g, '\x1BNUMBER$1\x1BEND')
    .replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, match => `\x1BSTRING${match}\x1BEND`)
    .split(/(\x1B\w+.*?\x1BEND)/g)
    .filter(Boolean)
    .join('');
}
