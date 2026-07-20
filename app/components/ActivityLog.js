'use client';

import { useRef, useEffect } from 'react';
import styles from './ActivityLog.module.css';

export default function ActivityLog({ entries }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries?.length]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>📜</span>
          Evolution Log
        </h3>
        <span className={styles.count}>{entries?.length || 0}</span>
      </div>
      <div className={styles.list}>
        {(!entries || entries.length === 0) ? (
          <div className={styles.empty}>No activity yet...</div>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className={`${styles.entry} ${styles[entry.type] || ''}`}>
              <span className={styles.entryIcon}>{getIcon(entry.type)}</span>
              <div className={styles.entryContent}>
                <span className={styles.entryMsg}>{entry.message}</span>
                <span className={styles.entryTime}>{entry.timestamp}</span>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function getIcon(type) {
  switch (type) {
    case 'generation': return '🧬';
    case 'mutation': return '⚡';
    case 'crossover': return '🔀';
    case 'evaluation': return '📊';
    case 'elite': return '👑';
    case 'perfect': return '🎉';
    case 'error': return '❌';
    case 'info': return 'ℹ️';
    case 'start': return '🚀';
    default: return '●';
  }
}
