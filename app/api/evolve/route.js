import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { performCrossover } from '../../lib/ast-crossover';

const MODEL = 'gpt-4o-mini';

function getClient(request) {
  const headerKey = request.headers.get('x-api-key');
  const apiKey = headerKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No API key provided.');
  return new OpenAI({ apiKey });
}

async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        // Exponential backoff: wait 1s, 2s, 4s...
        const waitTime = Math.pow(2, i) * 1000;
        console.log(`Rate limited (429). Retrying in ${waitTime}ms...`);
        await new Promise(res => setTimeout(res, waitTime));
        continue;
      }
      throw error;
    }
  }
}

export async function POST(request) {
  try {
    const openai = getClient(request);
    const {
      population,
      problem,
      config,
    } = await request.json();

    if (!population || !problem) {
      return NextResponse.json({ error: 'Population and problem required' }, { status: 400 });
    }

    const eliteCount = config?.eliteCount || 2;
    const requestedMutationRate = Number(config?.mutationRate ?? 0.5);
    const requestedCrossoverRate = Number(config?.crossoverRate ?? 0.3);
    // Reserve at least 10% of offspring for new approaches. Overcommitted
    // settings retain their mutation/crossover ratio after normalization.
    const totalVariation = Math.max(0.01, requestedMutationRate + requestedCrossoverRate);
    const variationScale = totalVariation > 0.9 ? 0.9 / totalVariation : 1;
    const mutationRate = Math.max(0, requestedMutationRate * variationScale);
    const crossoverRate = Math.max(0, requestedCrossoverRate * variationScale);

    // Sort by fitness (best first)
    const sorted = [...population].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));

    // Elite preservation — keep top organisms unchanged
    const elites = sorted.slice(0, eliteCount).map(o => ({
      code: o.code,
      parentIds: [o.id],
      operation: 'elite',
    }));

    // Generate offspring for remaining slots
    const offspringCount = population.length - eliteCount;
    const offspring = [];

    // Build context from top performers for the LLM
    const topPerformers = sorted.slice(0, Math.min(5, sorted.length));
    const topCode = topPerformers.map((o, i) =>
      `// Solution ${i + 1} (fitness: ${(o.fitness || 0).toFixed(3)}, correctness: ${((o.correctness || 0) * 100).toFixed(0)}%):\n${o.code}`
    ).join('\n\n');

    // Identify what's working and what's not
    const bestCorrectness = Math.max(...sorted.map(o => o.correctness || 0));
    const feedback = bestCorrectness < 1
      ? `The best solution passes ${(bestCorrectness * 100).toFixed(0)}% of tests. Focus on CORRECTNESS first.`
      : `All tests pass for the best solutions. Now optimize for PERFORMANCE and elegance.`;

    // Generate offspring via mutations and crossovers
    const promises = [];
    for (let i = 0; i < offspringCount; i++) {
      const roll = Math.random();
      if (roll < crossoverRate && topPerformers.length >= 2) {
        // Crossover: combine two parents
        const p1 = topPerformers[Math.floor(Math.random() * topPerformers.length)];
        const alternatives = topPerformers.filter(candidate => candidate.id !== p1.id);
        const p2 = alternatives[Math.floor(Math.random() * alternatives.length)];
        promises.push(
          crossover(openai, p1, p2, problem, feedback).then(code => ({
            code,
            parentIds: [p1.id, p2.id],
            operation: 'crossover',
          }))
        );
      } else if (roll < crossoverRate + mutationRate) {
        // Mutation: modify a parent
        const parent = topPerformers[Math.floor(Math.random() * topPerformers.length)];
        promises.push(
          mutate(openai, parent, problem, feedback).then(code => ({
            code,
            parentIds: [parent.id],
            operation: 'mutation',
          }))
        );
      } else {
        // Novel: generate fresh organism
        promises.push(
          generateNovel(openai, problem, topCode, feedback).then(code => ({
            code,
            parentIds: [],
            operation: 'novel',
          }))
        );
      }
    }

    const results = await Promise.all(promises);
    offspring.push(...results);

    return NextResponse.json({
      offspring: [...elites, ...offspring],
      model: MODEL,
      operationRates: {
        crossover: crossoverRate,
        mutation: mutationRate,
        novel: 1 - crossoverRate - mutationRate,
      },
    });
  } catch (error) {
    console.error('Evolution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evolve' },
      { status: 500 }
    );
  }
}

async function mutate(openai, parent, problem, feedback) {
  try {
    const completion = await withRetry(() => openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a code evolution engine. You receive a parent function and must mutate it to improve fitness. Output ONLY the mutated function code. No explanations, no markdown, no code blocks. The function MUST be named "solve".`,
        },
        {
          role: 'user',
          content: `TASK: ${problem.prompt}\n\nPARENT (fitness: ${(parent.fitness || 0).toFixed(3)}):\n${parent.code}\n\nFEEDBACK: ${feedback}\n\nMutate this function to fix bugs or optimize performance. Output ONLY the function named "solve".`,
        },
      ],
      temperature: 0.8,
      max_tokens: 1200,
    }));

    return cleanCode(completion.choices[0]?.message?.content?.trim() || parent.code);
  } catch (error) {
    console.error('Mutation failed:', error.message);
    if (error.status === 401) throw new Error('Invalid OpenAI API Key');
    return parent.code; // Return parent unchanged on failure
  }
}

async function crossover(openai, parent1, parent2, problem, feedback) {
  try {
    // Attempt authentic AST-aware crossover locally
    return performCrossover(parent1.code, parent2.code);
  } catch (error) {
    // Optional LLM Syntax Repair (only triggered if AST crossover produces syntax errors)
    console.error('AST Crossover failed, falling back to LLM Syntax Repair');
    try {
      const brokenCode = parent1.code; // Fallback to parent1 directly instead of undefined error.brokenCode
      const completion = await withRetry(() => openai.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: `You are a strict syntax repair tool. Fix syntax errors ONLY. Preserve all semantics. Do not optimize. Do not refactor. Do not rename variables. Do not change algorithms. Output ONLY the fixed function code. The function MUST be named "solve".`,
          },
          {
            role: 'user',
            content: `Fix the syntax of this code. Return ONLY the code:\n\n${parent1.code}\n\n// Note: Combine basic logic from:\n${parent2.code}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1200,
      }));

      return cleanCode(completion.choices[0]?.message?.content?.trim() || parent1.code);
    } catch (llmError) {
      if (llmError.status === 401) throw new Error('Invalid OpenAI API Key');
      return parent1.code;
    }
  }
}

async function generateNovel(openai, problem, topCode, feedback) {
  try {
    const completion = await withRetry(() => openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a code evolution engine. Generate a NOVEL solution that takes a completely different approach from existing solutions. Output ONLY the function code. No explanations, no markdown, no code blocks. The function MUST be named "solve".`,
        },
        {
          role: 'user',
          content: `TASK: ${problem.prompt}\n\nEXISTING TOP SOLUTIONS (avoid these approaches, try something DIFFERENT):\n${topCode}\n\n${feedback}\n\nGenerate a NOVEL approach. Output ONLY the function named "solve".`,
        },
      ],
      temperature: 1.1,
      max_tokens: 1200,
    }));

    return cleanCode(completion.choices[0]?.message?.content?.trim() || 'function solve() { return null; }');
  } catch (error) {
    console.error('Novel generation failed:', error.message);
    if (error.status === 401) throw new Error('Invalid OpenAI API Key');
    return 'function solve() { return null; }';
  }
}

function cleanCode(code) {
  let cleaned = code.replace(/^```(?:javascript|js)?\n?/gi, '').replace(/\n?```$/gi, '');
  const fnStart = cleaned.indexOf('function solve');
  if (fnStart > 0) cleaned = cleaned.substring(fnStart);
  let depth = 0;
  let fnEnd = -1;
  const braceStart = cleaned.indexOf('{');
  if (braceStart === -1) return cleaned.trim();
  for (let i = braceStart; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) { fnEnd = i + 1; break; }
    }
  }
  if (fnEnd > 0) cleaned = cleaned.substring(0, fnEnd);
  return cleaned.trim();
}
