'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Hero from './components/Hero';
import EvolutionGraph from './components/EvolutionGraph';
import FitnessChart from './components/FitnessChart';
import CodeViewer from './components/CodeViewer';
import ControlPanel from './components/ControlPanel';
import ActivityLog from './components/ActivityLog';
import {
  createOrganism,
  createBenchmarkCases,
  evaluatePopulation,
  getGenerationStats,
  DEFAULT_CONFIG,
} from './lib/evolution-engine';
import styles from './page.module.css';

export default function Home() {
  const [view, setView] = useState('hero'); // 'hero' | 'dashboard'
  const [apiKey, setApiKey] = useState(() => (
    typeof window === 'undefined' ? '' : localStorage.getItem('genesis-api-key') || ''
  ));
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [population, setPopulation] = useState([]);
  const [allOrganisms, setAllOrganisms] = useState([]); // All organisms ever (for graph ancestry)
  const [generation, setGeneration] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedOrganismId, setSelectedOrganismId] = useState(null);
  const [fitnessHistory, setFitnessHistory] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [hallOfFame, setHallOfFame] = useState([]); // Top 5 organisms all-time
  const stopRef = useRef(false);
  const genRef = useRef(0);
  const activeRunRef = useRef(false);
  const benchmarkCasesRef = useRef([]);
  const runEvolutionLoopRef = useRef(null);

  const addLog = useCallback((type, message) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('en-US', { hour12: false });
    setLogEntries(prev => [...prev, { type, message, timestamp }]);
  }, []);

  const handleStart = useCallback(() => {
    setView('dashboard');
  }, []);

  const exportEvolutionHistory = useCallback(() => {
    const data = {
      problem: selectedProblem,
      config,
      generations: fitnessHistory.length,
      fitnessHistory,
      hallOfFame,
      genealogy: allOrganisms.map(o => ({
        id: o.id,
        generation: o.generation,
        fitness: o.fitness,
        parents: o.parents,
        operation: o.operation,
        correctness: o.correctness,
        performance: o.performance,
        code: o.code
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genesis-evolution-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog('info', 'Exported evolution history to JSON');
  }, [selectedProblem, config, fitnessHistory, hallOfFame, allOrganisms, addLog]);

  // Generate the initial population or continue from an intentionally paused run.
  const startEvolution = useCallback(async () => {
    if (!selectedProblem || activeRunRef.current) return;

    if (population.length > 0) {
      activeRunRef.current = true;
      stopRef.current = false;
      setIsRunning(true);
      addLog('start', `Resuming evolution from generation ${generation}.`);
      try {
        await runEvolutionLoopRef.current(population, generation, benchmarkCasesRef.current);
      } finally {
        activeRunRef.current = false;
        setIsRunning(false);
      }
      return;
    }

    activeRunRef.current = true;
    setIsRunning(true);
    stopRef.current = false;
    genRef.current = 0;

    addLog('start', `Evolution started for "${selectedProblem.name}" with population ${config.populationSize}`);

    try {
      // Generate initial population via API
      addLog('info', 'Generating initial population using OpenAI gpt-4o-mini...');

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          problem: selectedProblem,
          populationSize: config.populationSize,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to generate population');
      }

      const { organisms: codes, model } = await res.json();
      if (stopRef.current) return;
      addLog('info', `Initial population generated with ${model || 'OpenAI gpt-4o-mini'}.`);
      addLog('info', `Generated ${codes.length} organisms`);

      // Create organism objects
      let pop = codes.map(code => createOrganism(code, 0));

      // Evaluate initial population
      addLog('evaluation', 'Evaluating initial population fitness...');
      benchmarkCasesRef.current = createBenchmarkCases(selectedProblem);
      pop = await evaluatePopulation(pop, selectedProblem, benchmarkCasesRef.current);
      if (stopRef.current) return;

      const initStats = getGenerationStats(pop);
      setStats(initStats);
      setFitnessHistory([initStats]);
      setPopulation(pop);
      setAllOrganisms(pop);

      // Initialize Hall of Fame
      const initialHof = [...pop].sort((a, b) => b.fitness - a.fitness).slice(0, 5);
      setHallOfFame(initialHof);

      setGeneration(0);

      addLog('evaluation', `Gen 0 — Best: ${initStats.best.toFixed(3)}, Avg: ${initStats.average.toFixed(3)}, Perfect: ${initStats.perfectCount}`);

      if (initStats.perfectCount > 0) {
        addLog('perfect', `🎉 ${initStats.perfectCount} perfect solution(s) found in initial population!`);
      }

      // Run evolution loop
      await runEvolutionLoopRef.current(pop, 0, benchmarkCasesRef.current);
    } catch (error) {
      addLog('error', `Error: ${error.message}`);
    } finally {
      if (stopRef.current) addLog('info', 'Evolution paused. The current population is ready to resume.');
      activeRunRef.current = false;
      setIsRunning(false);
    }
  }, [selectedProblem, apiKey, config, addLog, population, generation]);

  const runEvolutionLoop = useCallback(async (currentPop, startGen, benchmarkCases) => {
    let pop = currentPop;
    let gen = startGen;
    let bestFitnessEver = currentPop[0]?.fitness || 0;
    let stagnatedGenerations = 0;
    let currentMutationRate = config.mutationRate;

    for (let g = startGen + 1; g <= config.maxGenerations; g++) {
      if (stopRef.current) {
        addLog('info', 'Evolution paused by user.');
        break;
      }

      gen = g;
      genRef.current = g;
      addLog('generation', `Starting generation ${g}...`);

      try {
        const res = await fetch('/api/evolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            population: pop.map(o => ({
              id: o.id,
              code: o.code,
              fitness: o.fitness,
              correctness: o.correctness,
            })),
            problem: selectedProblem,
            config: { ...config, mutationRate: currentMutationRate },
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Evolution step failed');
        }

        const { offspring, model } = await res.json();
        if (stopRef.current) break;
        if (model) addLog('info', `Generation ${g} operations generated with ${model}.`);

        // Create new organisms from offspring
        const newPop = offspring.map(child =>
          createOrganism(child.code, g, child.parentIds || [])
        );

        // Add operation type for visualization
        offspring.forEach((child, i) => {
          if (newPop[i]) newPop[i].operation = child.operation;
        });

        // Evaluate new population
        // Await evaluatePopulation since it's now async
        const evaluatedPop = await evaluatePopulation(newPop, selectedProblem, benchmarkCases);
        if (stopRef.current) break;
        const genStats = getGenerationStats(evaluatedPop);

        // Adaptive Mutation Logic
        if (genStats.best <= bestFitnessEver) {
          stagnatedGenerations++;
          if (stagnatedGenerations >= 3) {
            currentMutationRate = Math.min(1.0, currentMutationRate + 0.15);
            if (stagnatedGenerations === 3) addLog('info', `Stagnation detected. Increased mutation rate to ${currentMutationRate.toFixed(2)}`);
          }
        } else {
          bestFitnessEver = genStats.best;
          stagnatedGenerations = 0;
          currentMutationRate = config.mutationRate; // Reset
        }

        // Log operations
        const ops = offspring.reduce((acc, c) => {
          acc[c.operation] = (acc[c.operation] || 0) + 1;
          return acc;
        }, {});
        const opsStr = Object.entries(ops).map(([k, v]) => `${v} ${k}`).join(', ');
        addLog('generation', `Gen ${g} — ${opsStr}`);
        addLog('evaluation', `Best: ${genStats.best.toFixed(3)}, Avg: ${genStats.average.toFixed(3)}, Perfect: ${genStats.perfectCount}`);

        if (genStats.perfectCount > 0 && genStats.best > 1.1) {
          addLog('perfect', `🎉 Generation ${g}: ${genStats.perfectCount} perfect solution(s) with high performance!`);
        }

        // Update state
        pop = evaluatedPop;
        setPopulation(evaluatedPop);
        // Preserve every organism instance. Parent IDs must remain resolvable for
        // a faithful cross-generation lineage graph.
        setAllOrganisms(prev => [...prev, ...evaluatedPop]);

        // Update Hall of Fame
        setHallOfFame(prev => {
          const combined = [...prev, ...evaluatedPop];
          // Deduplicate by code and take top 5
          const uniqueHof = Array.from(new Map(combined.map(item => [item.code, item])).values());
          return uniqueHof.sort((a, b) => b.fitness - a.fitness).slice(0, 5);
        });

        setGeneration(g);
        setStats(genStats);
        setFitnessHistory(prev => [...prev, genStats]);

        // Check convergence — if best fitness hasn't improved in 5 generations
        // (we continue anyway, but log it)
        if (genStats.best >= 1.0) {
          addLog('perfect', `🏆 Perfect fitness achieved at generation ${g}! Evolution continues to optimize performance...`);
        }

      } catch (error) {
        addLog('error', `Gen ${g} error: ${error.message}`);
        // Continue to next generation despite errors
      }
    }

    if (!stopRef.current) {
      addLog('info', `Evolution complete after ${gen} generations.`);
    }
    activeRunRef.current = false;
    setIsRunning(false);
  }, [apiKey, selectedProblem, config, addLog]);

  useEffect(() => {
    runEvolutionLoopRef.current = runEvolutionLoop;
  }, [runEvolutionLoop]);

  const handleStop = useCallback(() => {
    if (!activeRunRef.current) return;
    stopRef.current = true;
    addLog('info', 'Pausing after the active operation completes...');
  }, [addLog]);

  const handleReset = useCallback(() => {
    setPopulation([]);
    setAllOrganisms([]);
    setGeneration(0);
    setFitnessHistory([]);
    setLogEntries([]);
    setStats(null);
    setHallOfFame([]);
    setSelectedOrganismId(null);
    stopRef.current = false;
    benchmarkCasesRef.current = [];
  }, []);

  const selectedOrganism = population.find(o => o.id === selectedOrganismId) ||
                           allOrganisms.find(o => o.id === selectedOrganismId);

  useEffect(() => {
    if (apiKey) localStorage.setItem('genesis-api-key', apiKey);
  }, [apiKey]);

  if (view === 'hero') {
    return <Hero onStart={handleStart} />;
  }

  return (
    <div className={styles.dashboard}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <button className={styles.logo} onClick={() => setView('hero')}>
            <span className={styles.logoIcon}>🧬</span>
            <span className={styles.logoText}>GENESIS</span>
          </button>
          {selectedProblem && (
            <span className={styles.problemTag}>
              {selectedProblem.icon} {selectedProblem.name}
            </span>
          )}
        </div>
        <div className={styles.topBarRight}>
          <button className={styles.exportBtn} onClick={exportEvolutionHistory} disabled={!fitnessHistory.length}>
            💾 Export JSON
          </button>
          {isRunning && (
            <span className={styles.runningIndicator}>
              <span className={styles.runningDot} />
              Evolving Gen {generation}...
            </span>
          )}
          <span className={styles.genCounter}>Generation {generation}</span>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.main}>
        {/* Left Sidebar — Controls */}
        <aside className={styles.sidebar}>
          <ControlPanel
            selectedProblem={selectedProblem}
            onSelectProblem={setSelectedProblem}
            config={config}
            onConfigChange={setConfig}
            isRunning={isRunning}
            onStart={startEvolution}
            onStop={handleStop}
            onReset={handleReset}
            generation={generation}
            stats={stats}
            apiKey={apiKey}
            onApiKeyChange={setApiKey}
          />
        </aside>

        {/* Center — Visualization */}
        <div className={styles.center}>
          <div className={styles.graphArea}>
            <EvolutionGraph
              organisms={allOrganisms}
              activeOrganismIds={population.map(organism => organism.id)}
              generation={generation}
              onSelectOrganism={setSelectedOrganismId}
              selectedId={selectedOrganismId}
            />
          </div>
          <div className={styles.chartArea}>
            <FitnessChart history={fitnessHistory} />
          </div>
        </div>

        {/* Right Sidebar — Inspector + Log */}
        <aside className={styles.rightSidebar}>
          <div className={styles.inspectorArea}>
            {selectedOrganism ? (
              <CodeViewer
                organism={selectedOrganism}
                onClose={() => setSelectedOrganismId(null)}
              />
            ) : (
              <div className={styles.inspectorEmpty}>
                <div className={styles.inspectorEmptyIcon}>🔍</div>
                <p>Click an organism in the graph to inspect its code and fitness.</p>
              </div>
            )}
          </div>

          {hallOfFame.length > 0 && (
            <div className={styles.hofArea}>
              <div className={styles.hofHeader}>
                <span>🏆 Hall of Fame</span>
              </div>
              <div className={styles.hofList}>
                {hallOfFame.map((org, i) => (
                  <button
                    key={org.id}
                    className={`${styles.hofItem} ${selectedOrganismId === org.id ? styles.hofItemActive : ''}`}
                    onClick={() => setSelectedOrganismId(org.id)}
                  >
                    <span className={styles.hofRank}>#{i + 1}</span>
                    <div className={styles.hofInfo}>
                      <span className={styles.hofFitness}>Fit: {(org.fitness || 0).toFixed(2)}</span>
                      <span className={styles.hofGen}>Gen {org.generation}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.logArea}>
            <ActivityLog entries={logEntries} />
          </div>
        </aside>
      </div>
    </div>
  );
}
