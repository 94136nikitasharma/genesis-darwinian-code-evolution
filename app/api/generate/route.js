import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const MODEL = 'gpt-4o-mini';

function getClient(request) {
  const headerKey = request.headers.get('x-api-key');
  const apiKey = headerKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No API key provided. Please enter your OpenAI API key.');
  return new OpenAI({ apiKey });
}

async function withRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
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
    const { problem, populationSize = 12 } = await request.json();

    if (!problem || !problem.prompt) {
      return NextResponse.json({ error: 'Problem configuration required' }, { status: 400 });
    }

    // Generate diverse initial population using GPT
    const organisms = [];
    const approaches = [
      'Use a simple, straightforward iterative approach.',
      'Use a recursive divide-and-conquer approach.',
      'Use an unconventional or creative approach that might be more efficient.',
      'Use a well-known algorithm but implement it in an unusual way.',
      'Optimize for minimal memory usage.',
      'Optimize for minimal number of operations.',
      'Use a hash-based or lookup-table approach if applicable.',
      'Use a mathematical or formula-based approach.',
      'Use multiple passes or phases in the solution.',
      'Use a greedy approach.',
      'Use dynamic programming if applicable.',
      'Combine two different algorithmic strategies.',
    ];

    // Generate organisms in parallel batches
    const batchSize = 4;
    for (let i = 0; i < populationSize; i += batchSize) {
      const batch = [];
      for (let j = i; j < Math.min(i + batchSize, populationSize); j++) {
        const approach = approaches[j % approaches.length];
        batch.push(generateOrganism(openai, problem.prompt, approach, j));
      }
      const results = await Promise.all(batch);
      organisms.push(...results);
    }

    return NextResponse.json({ organisms, model: MODEL });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate population' },
      { status: 500 }
    );
  }
}

async function generateOrganism(openai, prompt, approach, index) {
  try {
    const completion = await withRetry(() => openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a code generator for an evolutionary algorithm system. Generate ONLY a JavaScript function. Output ONLY the function code, no explanations, no markdown formatting, no code blocks. The function MUST be named "solve".`,
        },
        {
          role: 'user',
          content: `${prompt}\n\nApproach hint: ${approach}\n\nOutput ONLY the JavaScript function. No markdown, no explanation, no \`\`\`, just pure JavaScript code starting with "function solve".`,
        },
      ],
      temperature: 0.9 + (index * 0.02), // Higher diversity for later organisms
      max_tokens: 1000,
    }));

    const code = completion.choices[0]?.message?.content?.trim() || '';
    return cleanCode(code);
  } catch (error) {
    console.error(`Failed to generate organism ${index}:`, error.message);
    if (error.status === 401) throw new Error('Invalid OpenAI API Key');
    // Return a minimal fallback
    return `function solve() { return null; }`;
  }
}

function cleanCode(code) {
  // Remove markdown code blocks if present
  let cleaned = code.replace(/^```(?:javascript|js)?\n?/gi, '').replace(/\n?```$/gi, '');
  // Remove any leading/trailing explanation text
  const fnStart = cleaned.indexOf('function solve');
  if (fnStart > 0) {
    cleaned = cleaned.substring(fnStart);
  }
  // Remove trailing text after the function closes
  let depth = 0;
  let fnEnd = -1;
  for (let i = cleaned.indexOf('{'); i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) {
        fnEnd = i + 1;
        break;
      }
    }
  }
  if (fnEnd > 0) {
    cleaned = cleaned.substring(0, fnEnd);
  }
  return cleaned.trim();
}
