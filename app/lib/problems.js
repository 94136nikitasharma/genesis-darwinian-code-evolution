/**
 * GENESIS — Preset Evolution Problems
 * Each problem defines what to evolve, how to test it, and how to score it.
 */

export const PROBLEMS = {
  sorting: {
    id: 'sorting',
    name: 'Sorting Algorithm',
    icon: '📊',
    description: 'Evolve a sorting algorithm that correctly sorts arrays with minimal comparisons and swaps.',
    difficulty: 'Medium',
    category: 'algorithms',
    prompt: `Write a JavaScript function called "solve" that takes an array of numbers and returns a new sorted array in ascending order. Do NOT use Array.prototype.sort(). Implement your own sorting logic. The function signature is: function solve(arr) { ... }`,
    testCases: [
      { input: [[5, 3, 8, 1, 2]], expected: [1, 2, 3, 5, 8] },
      { input: [[1]], expected: [1] },
      { input: [[3, 1]], expected: [1, 3] },
      { input: [[9, 7, 5, 3, 1, 2, 4, 6, 8, 0]], expected: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { input: [[1, 1, 1, 1]], expected: [1, 1, 1, 1] },
      { input: [[-3, 0, -1, 5, 2]], expected: [-3, -1, 0, 2, 5] },
      { input: [[100, 50, 75, 25, 0]], expected: [0, 25, 50, 75, 100] },
      { input: [[2, 1, 3]], expected: [1, 2, 3] },
    ],
    perfTest: {
      generator: (size, random = Math.random) => {
        const arr = [];
        for (let i = 0; i < size; i++) arr.push(Math.floor(random() * 10000));
        return [arr];
      },
      sizes: [100, 500, 1000],
    },
    perfExpected: ([arr]) => [...arr].sort((a, b) => a - b),
    compareFn: (result, expected) => JSON.stringify(result) === JSON.stringify(expected),
  },

  fibonacci: {
    id: 'fibonacci',
    name: 'Fibonacci Generator',
    icon: '🌀',
    description: 'Evolve an efficient function that computes the Nth Fibonacci number.',
    difficulty: 'Easy',
    category: 'algorithms',
    prompt: `Write a JavaScript function called "solve" that takes a non-negative integer n and returns the nth Fibonacci number (0-indexed: F(0)=0, F(1)=1, F(2)=1, F(3)=2, ...). It must be efficient for large n (up to 40). The function signature is: function solve(n) { ... }`,
    testCases: [
      { input: [0], expected: 0 },
      { input: [1], expected: 1 },
      { input: [2], expected: 1 },
      { input: [5], expected: 5 },
      { input: [10], expected: 55 },
      { input: [20], expected: 6765 },
      { input: [30], expected: 832040 },
      { input: [35], expected: 9227465 },
    ],
    perfTest: {
      generator: (size) => [size],
      sizes: [20, 30, 38],
    },
    perfExpected: ([n]) => {
      let a = 0;
      let b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return a;
    },
    compareFn: (result, expected) => result === expected,
  },

  stringSearch: {
    id: 'stringSearch',
    name: 'String Pattern Matcher',
    icon: '🔍',
    description: 'Evolve a function that finds all occurrences of a pattern in a text string.',
    difficulty: 'Hard',
    category: 'algorithms',
    prompt: `Write a JavaScript function called "solve" that takes two arguments: text (string) and pattern (string), and returns an array of starting indices where the pattern appears in the text. Do NOT use String.prototype.indexOf or String.prototype.match repeatedly. Implement your own search algorithm. The function signature is: function solve(text, pattern) { ... }`,
    testCases: [
      { input: ['hello world', 'lo'], expected: [3] },
      { input: ['aaaa', 'aa'], expected: [0, 1, 2] },
      { input: ['abcdef', 'xyz'], expected: [] },
      { input: ['abababab', 'aba'], expected: [0, 2, 4] },
      { input: ['aaa', 'a'], expected: [0, 1, 2] },
      { input: ['the cat in the hat', 'the'], expected: [0, 11] },
    ],
    perfTest: {
      generator: (size, random = Math.random) => {
        let text = '';
        const chars = 'abcd';
        for (let i = 0; i < size; i++) text += chars[Math.floor(random() * chars.length)];
        const patLen = Math.min(5, Math.floor(size / 10));
        const pattern = text.substring(0, patLen);
        return [text, pattern];
      },
      sizes: [1000, 5000, 10000],
    },
    perfExpected: ([text, pattern]) => {
      const matches = [];
      for (let i = 0; i <= text.length - pattern.length; i++) {
        let matchesPattern = true;
        for (let j = 0; j < pattern.length; j++) {
          if (text[i + j] !== pattern[j]) { matchesPattern = false; break; }
        }
        if (matchesPattern) matches.push(i);
      }
      return matches;
    },
    compareFn: (result, expected) => JSON.stringify(result) === JSON.stringify(expected),
  },

  maxSubarray: {
    id: 'maxSubarray',
    name: 'Maximum Subarray',
    icon: '📈',
    description: 'Evolve an algorithm to find the contiguous subarray with the largest sum.',
    difficulty: 'Medium',
    category: 'algorithms',
    prompt: `Write a JavaScript function called "solve" that takes an array of integers (possibly negative) and returns the sum of the contiguous subarray with the largest sum. If the array is empty, return 0. The function signature is: function solve(arr) { ... }`,
    testCases: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
      { input: [[1, 2, 3, 4]], expected: 10 },
      { input: [[-1, -2, -3]], expected: -1 },
      { input: [[5]], expected: 5 },
      { input: [[-1]], expected: -1 },
      { input: [[2, -1, 2, 3, 4, -5]], expected: 10 },
      { input: [[-2, -1]], expected: -1 },
      { input: [[]], expected: 0 },
    ],
    perfTest: {
      generator: (size, random = Math.random) => {
        const arr = [];
        for (let i = 0; i < size; i++) arr.push(Math.floor(random() * 200) - 100);
        return [arr];
      },
      sizes: [1000, 10000, 50000],
    },
    perfExpected: ([arr]) => {
      let best = -Infinity;
      let current = 0;
      for (const value of arr) {
        current = Math.max(value, current + value);
        best = Math.max(best, current);
      }
      return best;
    },
    compareFn: (result, expected) => result === expected,
  },

  flatten: {
    id: 'flatten',
    name: 'Deep Array Flatten',
    icon: '🗜️',
    description: 'Evolve a function that deeply flattens nested arrays of any depth.',
    difficulty: 'Easy',
    category: 'algorithms',
    prompt: `Write a JavaScript function called "solve" that takes an arbitrarily nested array and returns a flat array with all elements in order. Do NOT use Array.prototype.flat(). The function signature is: function solve(arr) { ... }`,
    testCases: [
      { input: [[[1, [2, [3, [4]]]]]], expected: [1, 2, 3, 4] },
      { input: [[[1, 2, 3]]], expected: [1, 2, 3] },
      { input: [[[]]], expected: [] },
      { input: [[[1, [2], [[3]], [[[4]]]]]], expected: [1, 2, 3, 4] },
      { input: [[['a', ['b', ['c']]]]], expected: ['a', 'b', 'c'] },
      { input: [[[1, [], [2, [], [3]]]]], expected: [1, 2, 3] },
    ],
    perfTest: null,
    perfExpected: null,
    compareFn: (result, expected) => JSON.stringify(result) === JSON.stringify(expected),
  },
};

export const PROBLEM_LIST = Object.values(PROBLEMS);

export function getProblem(id) {
  return PROBLEMS[id] || null;
}
