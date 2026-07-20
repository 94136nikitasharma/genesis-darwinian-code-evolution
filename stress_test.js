const { Worker } = require('worker_threads');

const testCases = [
  { input: [ [3,1,2] ], expected: [1,2,3] }
];

const perfArgs = [ [ [3,2,1,4,5] ] ];

function testOrganism(code, name) {
  return new Promise((resolve) => {
    // In Node.js we need a different worker setup than browser,
    // but we can just evaluate the factory logic directly to test for crashes.
    console.log(`Testing ${name}...`);
    try {
      let fnCode = code.trim().replace(/^```(?:javascript|js)?\n?/i, '').replace(/\n?```$/i, '');
      const factory = new Function(`
        'use strict';
        ${fnCode}
        return typeof solve === 'function' ? solve : null;
      `);
      let fn = factory();

      let passed = 0;
      for (const tc of testCases) {
         let start = Date.now();
         let res = fn(...tc.input);
         if (Date.now() - start > 500) throw new Error("Timeout"); // simple mock
         passed++;
      }
      console.log(`[PASS] ${name}`);
      resolve(passed);
    } catch(e) {
      console.log(`[FAIL/ERROR] ${name} - ${e.message}`);
      resolve(0);
    }
  });
}

async function run() {
  await testOrganism('function solve() { while(true){} }', 'Infinite Loop');
  await testOrganism('function solve() { return Array(10000000).fill(0); }', 'Memory Explosion');
  await testOrganism('function solve() { return solve(); }', 'Infinite Recursion');
  await testOrganism('function solve(', 'Syntax Error');
}
run();
