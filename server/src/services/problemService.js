/**
 * @module services/problemService
 * @description Generates coding challenges using the AI service and validates
 * solutions by running code against test cases.
 */

import aiService from './aiService.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/** Supported duel languages and their runners */
const RUNNERS = {
  javascript: { ext: '.js', cmd: (f) => ['node', [f]] },
  python:     { ext: '.py', cmd: (f) => ['python', [f]] },
  cpp:        { ext: '.cpp', compile: (f, o) => ['g++', [f, '-o', o]], cmd: (f, o) => [o, []] },
  c:          { ext: '.c',   compile: (f, o) => ['gcc', [f, '-o', o]], cmd: (f, o) => [o, []] },
  typescript: { ext: '.ts', cmd: (f) => ['npx', ['tsx', f]] },
  go:         { ext: '.go', cmd: (f) => ['go', ['run', f]] },
};

/** Maximum execution time per test case (ms) */
const TEST_TIMEOUT = 10000;

/**
 * Difficulty-to-prompt mapping for AI problem generation.
 */
const DIFFICULTY_PROMPTS = {
  easy: 'a simple beginner-level algorithmic problem (arrays, strings, basic math). It should be solvable in under 5 minutes by an intermediate developer.',
  medium: 'a medium-difficulty algorithmic problem (sorting, searching, hash maps, two pointers). It should require some thought but be solvable in 10 minutes.',
  hard: 'a challenging algorithmic problem (dynamic programming, graphs, trees, or complex data structures). It should push experienced developers.',
};

/**
 * Generates a coding challenge using the AI service.
 * @param {string} language - Programming language for the challenge.
 * @param {string} [difficulty='medium'] - Difficulty level (easy/medium/hard).
 * @returns {Promise<{title: string, description: string, starterCode: string, testCases: Array<{input: string, expectedOutput: string}>}>}
 */
export async function generateProblem(language, difficulty = 'medium') {
  const difficultyDesc = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.medium;

  const systemPrompt = `You are a competitive programming problem generator. Generate ${difficultyDesc}

CRITICAL RULES:
1. The problem must be solvable in ${language}.
2. Return ONLY valid JSON — no markdown fences, no extra text.
3. The starterCode must include a complete runnable solution template that reads from stdin and prints to stdout.
4. Generate exactly 5 test cases. The first 2 are "visible" (shown to users), the last 3 are "hidden" (used for judging).
5. Each test case input/output must be a string (what gets piped to stdin / what stdout should produce).
6. The problem should have a clear, unambiguous specification.

Return JSON in this exact format:
{
  "title": "Problem Title",
  "description": "Full problem description in markdown. Include examples.",
  "starterCode": "// Complete template code with stdin reading and stdout printing",
  "testCases": [
    {"input": "example input 1", "expectedOutput": "expected output 1"},
    {"input": "example input 2", "expectedOutput": "expected output 2"},
    {"input": "hidden input 3", "expectedOutput": "expected output 3"},
    {"input": "hidden input 4", "expectedOutput": "expected output 4"},
    {"input": "hidden input 5", "expectedOutput": "expected output 5"}
  ]
}`;

  const userPrompt = `Generate a coding duel problem in ${language} at ${difficulty} difficulty. Return only valid JSON.`;

  try {
    const response = await aiService.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      3000
    );

    // Parse the JSON response — strip any markdown fences if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const problem = JSON.parse(cleaned);

    // Validate structure
    if (
      !problem.title ||
      !problem.description ||
      !problem.starterCode ||
      !Array.isArray(problem.testCases) ||
      problem.testCases.length < 3
    ) {
      throw new Error('Invalid problem structure from AI');
    }

    return {
      title: problem.title,
      description: problem.description,
      starterCode: problem.starterCode,
      testCases: problem.testCases.map((tc) => ({
        input: String(tc.input || ''),
        expectedOutput: String(tc.expectedOutput || tc.expected_output || '').trim(),
      })),
    };
  } catch (error) {
    console.error('Problem generation failed:', error.message);
    // Return a fallback problem
    return getFallbackProblem(language, difficulty);
  }
}

/**
 * Validates a solution by running code against test cases.
 * @param {string} code - The code to test.
 * @param {string} language - Programming language.
 * @param {Array<{input: string, expectedOutput: string}>} testCases - Test cases.
 * @returns {Promise<{passed: number, total: number, results: Array<{passed: boolean, input: string, expected: string, actual: string, error: string}>}>}
 */
export async function validateSolution(code, language, testCases) {
  const runner = RUNNERS[language];
  if (!runner) {
    return {
      passed: 0,
      total: testCases.length,
      results: testCases.map(() => ({
        passed: false,
        input: '',
        expected: '',
        actual: '',
        error: `Unsupported language: ${language}`,
      })),
    };
  }

  const results = [];
  let passed = 0;

  for (const tc of testCases) {
    const result = await runSingleTest(code, language, runner, tc.input, tc.expectedOutput);
    results.push(result);
    if (result.passed) passed++;
  }

  return { passed, total: testCases.length, results };
}

/**
 * Runs code against a single test case.
 * @private
 */
async function runSingleTest(code, language, runner, input, expectedOutput) {
  const tmpDir = path.join(os.tmpdir(), `duel-${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const srcFile = path.join(tmpDir, `solution${runner.ext}`);
  const outFile = path.join(tmpDir, os.platform() === 'win32' ? 'solution.exe' : 'solution');

  try {
    fs.writeFileSync(srcFile, code, 'utf-8');

    // Compile if needed
    if (runner.compile) {
      const [compileCmd, compileArgs] = runner.compile(srcFile, outFile);
      const compileResult = await executeWithTimeout(compileCmd, compileArgs, tmpDir, null, TEST_TIMEOUT);
      if (compileResult.exitCode !== 0) {
        return {
          passed: false,
          input,
          expected: expectedOutput,
          actual: '',
          error: `Compilation Error: ${compileResult.stderr}`,
        };
      }
    }

    // Run
    const [runCmd, runArgs] = runner.cmd(srcFile, outFile);
    const result = await executeWithTimeout(runCmd, runArgs, tmpDir, input, TEST_TIMEOUT);

    const actualOutput = result.stdout.trim();
    const isPassed = actualOutput === expectedOutput.trim();

    return {
      passed: isPassed,
      input,
      expected: expectedOutput.trim(),
      actual: actualOutput,
      error: result.stderr || '',
    };
  } catch (error) {
    return {
      passed: false,
      input,
      expected: expectedOutput,
      actual: '',
      error: error.message,
    };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Executes a process with a timeout.
 * @private
 */
function executeWithTimeout(cmd, args, cwd, stdinData, timeout) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const start = Date.now();

    const proc = spawn(cmd, args, {
      cwd,
      timeout,
      env: { ...process.env, NODE_ENV: 'production' },
      shell: true,
    });

    if (stdinData) {
      proc.stdin.write(stdinData);
    }
    proc.stdin.end();

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      if (stdout.length > 50000) {
        proc.kill();
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        duration: Date.now() - start,
      });
    });

    proc.on('error', (err) => {
      resolve({
        stdout: '',
        stderr: `Failed to start: ${err.message}`,
        exitCode: 1,
        duration: Date.now() - start,
      });
    });
  });
}

/**
 * Returns a fallback problem when AI generation fails.
 * @private
 */
function getFallbackProblem(language, difficulty) {
  const problems = {
    easy: {
      title: 'Two Sum',
      description: `## Two Sum\n\nGiven an array of integers and a target sum, find two numbers that add up to the target.\n\n### Input\n- First line: space-separated integers (the array)\n- Second line: the target sum\n\n### Output\n- Print the two numbers separated by a space (smaller first)\n\n### Example\nInput:\n\`\`\`\n2 7 11 15\n9\n\`\`\`\nOutput:\n\`\`\`\n2 7\n\`\`\``,
      starterCode: getStarterCode(language, 'twosum'),
      testCases: [
        { input: '2 7 11 15\n9', expectedOutput: '2 7' },
        { input: '3 2 4\n6', expectedOutput: '2 4' },
        { input: '1 5 3 7 2\n8', expectedOutput: '1 7' },
        { input: '10 20 30 40 50\n60', expectedOutput: '10 50' },
        { input: '-1 0 1 2\n1', expectedOutput: '-1 2' },
      ],
    },
    medium: {
      title: 'Longest Substring Without Repeating',
      description: `## Longest Substring Without Repeating Characters\n\nGiven a string, find the length of the longest substring without repeating characters.\n\n### Input\n- A single string\n\n### Output\n- Print the length of the longest substring\n\n### Example\nInput:\n\`\`\`\nabcabcbb\n\`\`\`\nOutput:\n\`\`\`\n3\n\`\`\``,
      starterCode: getStarterCode(language, 'longest_substring'),
      testCases: [
        { input: 'abcabcbb', expectedOutput: '3' },
        { input: 'bbbbb', expectedOutput: '1' },
        { input: 'pwwkew', expectedOutput: '3' },
        { input: 'abcdefg', expectedOutput: '7' },
        { input: 'aab', expectedOutput: '2' },
      ],
    },
    hard: {
      title: 'Maximum Subarray Sum',
      description: `## Maximum Subarray Sum\n\nGiven an array of integers, find the contiguous subarray with the largest sum (Kadane's algorithm).\n\n### Input\n- Space-separated integers\n\n### Output\n- Print the maximum subarray sum\n\n### Example\nInput:\n\`\`\`\n-2 1 -3 4 -1 2 1 -5 4\n\`\`\`\nOutput:\n\`\`\`\n6\n\`\`\``,
      starterCode: getStarterCode(language, 'max_subarray'),
      testCases: [
        { input: '-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
        { input: '1', expectedOutput: '1' },
        { input: '5 4 -1 7 8', expectedOutput: '23' },
        { input: '-1 -2 -3 -4', expectedOutput: '-1' },
        { input: '1 2 3 -2 5', expectedOutput: '9' },
      ],
    },
  };

  return problems[difficulty] || problems.medium;
}

/**
 * Returns starter code templates for fallback problems.
 * @private
 */
function getStarterCode(language, problem) {
  const templates = {
    javascript: {
      twosum: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (line) => lines.push(line.trim()));
rl.on('close', () => {
  const nums = lines[0].split(' ').map(Number);
  const target = parseInt(lines[1]);
  // Your solution here
  
});`,
      longest_substring: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const s = line.trim();
  // Your solution here
  
});`,
      max_subarray: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  const nums = line.trim().split(' ').map(Number);
  // Your solution here
  
});`,
    },
    python: {
      twosum: `nums = list(map(int, input().split()))
target = int(input())
# Your solution here
`,
      longest_substring: `s = input().strip()
# Your solution here
`,
      max_subarray: `nums = list(map(int, input().split()))
# Your solution here
`,
    },
  };

  const langTemplates = templates[language] || templates.javascript;
  return langTemplates[problem] || '// Write your solution here\n';
}

export default { generateProblem, validateSolution };
