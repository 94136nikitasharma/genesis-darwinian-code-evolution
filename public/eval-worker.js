// Isolated browser execution with timeout is managed by the caller.

self.onmessage = function (e) {
  const { id, code, testCases, perfCases = [] } = e.data;

  const results = {
    id,
    correctness: 0,
    performance: 0,
    testsPass: 0,
    totalTests: testCases.length,
    error: null,
    executionTime: 0,
    details: [],
  };

  try {
    let fnCode = code.trim();
    fnCode = fnCode.replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '');

    const factory = new Function(`
      'use strict';
      ${fnCode}
      return typeof solve === 'function' ? solve : null;
    `);

    let fn = factory();
    if (typeof fn !== 'function') {
      const altFactory = new Function(`
        'use strict';
        return (${fnCode});
      `);
      fn = altFactory();
    }

    if (typeof fn !== 'function') {
      throw new Error('Failed to parse function');
    }

    let totalTime = 0;
    let passed = 0;

    // Run Correctness Tests
    for (const testCase of testCases) {
      try {
        const start = performance.now();
        const result = fn(...testCase.input);
        const elapsed = performance.now() - start;
        totalTime += elapsed;

        // Simplified deep equality for basic structures
        const correct = JSON.stringify(result) === JSON.stringify(testCase.expected);
        if (correct) passed++;

        results.details.push({
          input: JSON.stringify(testCase.input).slice(0, 80),
          expected: JSON.stringify(testCase.expected).slice(0, 80),
          got: JSON.stringify(result).slice(0, 80),
          correct,
          time: elapsed,
        });
      } catch (err) {
        results.details.push({
          input: JSON.stringify(testCase.input).slice(0, 80),
          expected: JSON.stringify(testCase.expected).slice(0, 80),
          got: `Error: ${err.message}`,
          correct: false,
          time: 0,
        });
      }
    }

    results.testsPass = passed;
    results.correctness = passed / testCases.length;
    results.executionTime = totalTime;

    // Run Performance Tests only after correctness succeeds. Each run receives a
    // fresh clone so input-mutating implementations cannot gain an advantage.
    if (results.correctness === 1 && perfCases.length > 0) {
      try {
        let allTimes = [];
        const WARMUP_RUNS = 20;
        const BENCH_RUNS = 200;

        for (const perfCase of perfCases) {
          const verificationResult = fn(...structuredClone(perfCase.args));
          if (JSON.stringify(verificationResult) !== JSON.stringify(perfCase.expected)) {
            throw new Error('Performance input verification failed');
          }

          // Warmup
          for (let i = 0; i < WARMUP_RUNS; i++) fn(...structuredClone(perfCase.args));

          // Benchmark
          for (let i = 0; i < BENCH_RUNS; i++) {
            const start = performance.now();
            const result = fn(...structuredClone(perfCase.args));
            const elapsed = performance.now() - start;
            if (JSON.stringify(result) !== JSON.stringify(perfCase.expected)) {
              throw new Error('Performance benchmark returned an incorrect result');
            }
            allTimes.push(elapsed);
          }
        }

        // Calculate metrics
        allTimes.sort((a, b) => a - b);
        const count = allTimes.length;
        const sum = allTimes.reduce((a, b) => a + b, 0);
        const mean = sum / count;

        const mid = Math.floor(count / 2);
        const median = count % 2 !== 0 ? allTimes[mid] : (allTimes[mid - 1] + allTimes[mid]) / 2;

        const variance = allTimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        results.perfMetrics = {
          median,
          mean,
          stdDev,
          verified: true,
        };

        // Inverse score based on Median: max 1.0 (0ms), min 0.0 (10ms+ for sub-ms operations)
        // Cap the median at 10ms for scoring purposes
        results.performance = Math.max(0, 1 - (Math.min(median, 10) / 10));
      } catch (err) {
        results.performance = 0;
        results.perfMetrics = { verified: false, error: err.message };
      }
    }

  } catch (err) {
    results.error = err.message;
  }

  self.postMessage(results);
};
