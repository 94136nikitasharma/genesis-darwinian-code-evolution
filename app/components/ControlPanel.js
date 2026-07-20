'use client';

import { PROBLEM_LIST } from '../lib/problems';
import styles from './ControlPanel.module.css';

export default function ControlPanel({
  selectedProblem,
  onSelectProblem,
  config,
  onConfigChange,
  isRunning,
  onStart,
  onStop,
  onReset,
  generation,
  stats,
  apiKey,
  onApiKeyChange,
}) {
  return (
    <div className={styles.container}>
      {/* API Key */}
      <div className={styles.section}>
        <label className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🔑</span>
          OpenAI API Key
        </label>
        <input
          type="password"
          className={styles.input}
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          id="api-key-input"
        />
        <p className={styles.hint}>Optional when the server has OPENAI_API_KEY configured. Uses OpenAI gpt-4o-mini.</p>
        <p className={styles.hint}>Evaluation uses isolated browser execution with timeout.</p>
      </div>

      {/* Problem Selection */}
      <div className={styles.section}>
        <label className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>🎯</span>
          Evolution Target
        </label>
        <div className={styles.problemGrid}>
          {PROBLEM_LIST.map((problem) => (
            <button
              key={problem.id}
              className={`${styles.problemCard} ${selectedProblem?.id === problem.id ? styles.problemCardActive : ''}`}
              onClick={() => onSelectProblem(problem)}
              disabled={isRunning}
              id={`problem-${problem.id}`}
            >
              <span className={styles.problemIcon}>{problem.icon}</span>
              <div className={styles.problemInfo}>
                <span className={styles.problemName}>{problem.name}</span>
                <span className={styles.problemDifficulty}>{problem.difficulty}</span>
              </div>
            </button>
          ))}
        </div>
        {selectedProblem && (
          <p className={styles.problemDesc}>{selectedProblem.description}</p>
        )}
      </div>

      {/* Configuration */}
      <div className={styles.section}>
        <label className={styles.sectionTitle}>
          <span className={styles.sectionIcon}>⚙️</span>
          Parameters
        </label>
        <div className={styles.configGrid}>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Population</label>
            <input
              type="number"
              className={styles.configInput}
              value={config.populationSize}
              disabled={isRunning}
              min={4}
              max={24}
              onChange={(e) => onConfigChange({ ...config, populationSize: parseInt(e.target.value) || 8 })}
              id="config-population"
            />
          </div>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Generations</label>
            <input
              type="number"
              className={styles.configInput}
              value={config.maxGenerations}
              disabled={isRunning}
              min={5}
              max={100}
              onChange={(e) => onConfigChange({ ...config, maxGenerations: parseInt(e.target.value) || 20 })}
              id="config-generations"
            />
          </div>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Mutation %</label>
            <input
              type="number"
              className={styles.configInput}
              value={Math.round(config.mutationRate * 100)}
              disabled={isRunning}
              min={10}
              max={100}
              onChange={(e) => onConfigChange({ ...config, mutationRate: (parseInt(e.target.value) || 50) / 100 })}
              id="config-mutation"
            />
          </div>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Crossover %</label>
            <input
              type="number"
              className={styles.configInput}
              value={Math.round(config.crossoverRate * 100)}
              disabled={isRunning}
              min={10}
              max={80}
              onChange={(e) => onConfigChange({ ...config, crossoverRate: (parseInt(e.target.value) || 30) / 100 })}
              id="config-crossover"
            />
          </div>
          <div className={styles.configItem}>
            <label className={styles.configLabel}>Elites</label>
            <input
              type="number"
              className={styles.configInput}
              value={config.eliteCount}
              disabled={isRunning}
              min={1}
              max={6}
              onChange={(e) => onConfigChange({ ...config, eliteCount: parseInt(e.target.value) || 2 })}
              id="config-elites"
            />
          </div>
        </div>
        <p className={styles.hint}>At least 10% of offspring are always novel to preserve diversity.</p>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!isRunning ? (
          <button
            className="btn btn-primary btn-lg"
            onClick={onStart}
            disabled={!selectedProblem}
            style={{ width: '100%' }}
            id="evolve-btn"
          >
            {generation > 0 ? '▶ Resume Evolution' : '🧬 Start Evolution'}
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-lg"
            onClick={onStop}
            style={{ width: '100%', borderColor: 'var(--accent-danger)' }}
            id="stop-btn"
          >
            ⏸ Pause Evolution
          </button>
        )}
        {generation > 0 && !isRunning && (
          <button className="btn btn-ghost" onClick={onReset} id="reset-btn">
            🗑 Reset
          </button>
        )}
      </div>

      {/* Live Stats */}
      {stats && (
        <div className={styles.liveStats}>
          <div className={styles.statRow}>
            <span>Generation</span>
            <span className={styles.statVal}>{generation}</span>
          </div>
          <div className={styles.statRow}>
            <span>Best Fitness</span>
            <span className={styles.statVal} style={{ color: 'var(--accent-primary)' }}>
              {stats.best?.toFixed(3) || '—'}
            </span>
          </div>
          <div className={styles.statRow}>
            <span>Avg Fitness</span>
            <span className={styles.statVal}>{stats.average?.toFixed(3) || '—'}</span>
          </div>
          <div className={styles.statRow}>
            <span>Perfect Solutions</span>
            <span className={styles.statVal} style={{ color: stats.perfectCount > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
              {stats.perfectCount || 0}
            </span>
          </div>
          <div className={styles.statRow}>
            <span>Population</span>
            <span className={styles.statVal}>{stats.populationSize || 0}</span>
          </div>
        </div>
      )}
    </div>
  );
}
