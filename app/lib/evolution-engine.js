/**
 * GENESIS — Core Evolution Engine
 * Client-side evolution orchestrator that manages populations,
 * generations, and the evolutionary lifecycle.
 */

// Generate a unique ID for organisms
let _orgId = 0;
export function generateId() {
  return `org-${Date.now()}-${++_orgId}`;
}

/**
 * Create a new organism from code
 */
export function createOrganism(code, generation = 0, parents = []) {
  return {
    id: generateId(),
    code,
    generation,
    parents, // IDs of parent organisms
    fitness: null,
    correctness: 0, // 0-1, fraction of tests passed
    performance: 0, // relative performance score
    alive: true,
    born: Date.now(),
    color: generateOrganismColor(generation),
    mutations: 0,
  };
}

function createSeededRandom(seedText) {
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a fixed benchmark suite once per run. Every organism receives identical
 * inputs and expected outputs, making performance comparisons reproducible.
 */
export function createBenchmarkCases(problem) {
  if (!problem?.perfTest || !problem.perfExpected) return [];

  const random = createSeededRandom(`genesis-benchmark-v1:${problem.id}`);
  return problem.perfTest.sizes.map(size => {
    const args = problem.perfTest.generator(size, random);
    return { args, expected: problem.perfExpected(args) };
  });
}

/**
 * Generate a color based on generation (evolves from red → orange → green → cyan)
 */
function generateOrganismColor(generation) {
  const hue = Math.min(160, generation * 8); // red(0) → green(120) → cyan(160)
  const saturation = 80 + Math.random() * 20;
  const lightness = 55 + Math.random() * 15;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Evaluate a single organism's fitness using a Web Worker with timeout
 */
export function evaluateOrganism(organism, problem, benchmarkCases = []) {
  return new Promise((resolve) => {
    const worker = new Worker('/eval-worker.js?v=' + Date.now());

    // Safety timeout (5 seconds) to terminate runaway executions.
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({
        error: 'Execution Timeout (Infinite Loop Detected)',
        correctness: 0,
        performance: 0,
        testsPass: 0,
        totalTests: problem.testCases.length,
        executionTime: 0,
        details: [{
          input: 'Timeout', expected: '-', got: 'Infinite Loop', correct: false, time: 5000
        }]
      });
    }, 5000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(e.data);
    };

    worker.onerror = (e) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve({
        error: 'Worker Error: ' + e.message,
        correctness: 0,
        performance: 0,
        testsPass: 0,
        totalTests: problem.testCases.length,
        executionTime: 0,
        details: []
      });
    };

    // Send payload
    worker.postMessage({
      id: organism.id,
      code: organism.code,
      testCases: problem.testCases,
      perfCases: benchmarkCases
    });
  });
}

/**
 * Calculate composite fitness score (Tiered/Lexicase)
 * Correctness strictly dominates. Performance is only a bonus for perfect correctness.
 */
export function calculateFitness(evalResults) {
  if (evalResults.correctness < 1.0) {
    return evalResults.correctness; // 0.0 to 0.99
  }
  // If perfect correctness, fitness is 1.0 + (performance * 0.2) -> 1.0 to 1.2
  return 1.0 + (evalResults.performance * 0.2);
}

/**
 * Tournament selection — pick the best from a random subset
 */
export function tournamentSelect(population, tournamentSize = 3) {
  const tournament = [];
  for (let i = 0; i < tournamentSize; i++) {
    const idx = Math.floor(Math.random() * population.length);
    tournament.push(population[idx]);
  }
  tournament.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
  return tournament[0];
}

/**
 * Select parents for next generation using tournament selection
 */
export function selectParents(population, count) {
  const parents = [];
  for (let i = 0; i < count; i++) {
    parents.push(tournamentSelect(population));
  }
  return parents;
}

/**
 * Evaluate entire population and assign fitness scores (Async)
 */
export async function evaluatePopulation(population, problem, benchmarkCases = createBenchmarkCases(problem)) {
  const promises = population.map(async (organism) => {
    const results = await evaluateOrganism(organism, problem, benchmarkCases);
    const fitness = calculateFitness(results);
    return {
      ...organism,
      fitness,
      correctness: results.correctness || 0,
      performance: results.performance || 0,
      evalDetails: results,
    };
  });

  const evaluated = await Promise.all(promises);

  // Sort by fitness (best first)
  evaluated.sort((a, b) => b.fitness - a.fitness);
  return evaluated;
}

/**
 * Get generation statistics
 */
export function getGenerationStats(population) {
  const fitnesses = population.map(o => o.fitness || 0);
  const correctnesses = population.map(o => o.correctness || 0);

  return {
    best: Math.max(...fitnesses),
    worst: Math.min(...fitnesses),
    average: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
    median: fitnesses.sort((a, b) => a - b)[Math.floor(fitnesses.length / 2)],
    bestCorrectness: Math.max(...correctnesses),
    avgCorrectness: correctnesses.reduce((a, b) => a + b, 0) / correctnesses.length,
    perfectCount: correctnesses.filter(c => c === 1).length,
    populationSize: population.length,
  };
}

/**
 * Evolution configuration defaults
 */
export const DEFAULT_CONFIG = {
  populationSize: 12,
  maxGenerations: 30,
  eliteCount: 2, // number of top organisms that survive unchanged
  mutationRate: 0.5,
  crossoverRate: 0.3,
  tournamentSize: 3,
};
