/**
 * @module services/problemService
 * @description Provides trusted coding challenges from the static database and validates
 * solutions by running code against test cases.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

let trustedProblems = null;

function loadTrustedProblems() {
  if (trustedProblems) return trustedProblems;
  try {
    const dataPath = path.join(__dirname, '..', 'data', 'trusted_problems.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    trustedProblems = JSON.parse(data);
  } catch (error) {
    console.error('Failed to load trusted problems:', error.message);
    trustedProblems = []; // Fallback to empty array to prevent crashes
  }
  return trustedProblems;
}

function getGenericStarterCode(language) {
  if (language === 'javascript' || language === 'typescript') {
    return `const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let inputLines = [];

rl.on('line', (line) => {
  inputLines.push(line);
});

rl.on('close', () => {
  const input = inputLines.join('\\n').trim();
  // Your solution here
  // Use console.log() to print your final answer
  
});`;
  }
  if (language === 'python') {
    return `import sys\ninput_data = sys.stdin.read().strip()\n\n# Your solution here\n# Use print() to output your final answer`;
  }
  if (language === 'cpp') {
    return `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    // Your solution here\n    // Read using cin, print using cout\n    return 0;\n}`;
  }
  if (language === 'c') {
    return `#include <stdio.h>\n\nint main() {\n    // Your solution here\n    // Read using scanf, print using printf\n    return 0;\n}`;
  }
  if (language === 'go') {
    return `package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n\t"os"\n)\n\nfunc main() {\n\tbytes, _ := ioutil.ReadAll(os.Stdin)\n\tinput := string(bytes)\n\n\t// Your solution here\n\t// Use fmt.Println() to print your final answer\n}`;
  }
  return '// Write your solution here';
}

/**
 * Returns a random coding challenge from the trusted database.
 * @param {string} language - Programming language for the challenge.
 * @param {string} [difficulty='medium'] - Difficulty level (easy/medium/hard).
 * @returns {Promise<{title: string, description: string, starterCode: string, testCases: Array<{input: string, expectedOutput: string}>}>}
 */
export async function generateProblem(language, difficulty = 'medium') {
  const problems = loadTrustedProblems();
  
  // Filter by requested difficulty
  const available = problems.filter(p => p.difficulty === difficulty);
  
  // Fallback to any difficulty if none exist
  const pool = available.length > 0 ? available : problems;

  if (pool.length === 0) {
    throw new Error("No trusted problems found in database.");
  }

  // Pick random problem
  const problem = pool[Math.floor(Math.random() * pool.length)];

  return {
    title: problem.title,
    description: problem.description,
    starterCode: getGenericStarterCode(language),
    testCases: problem.testCases,
  };
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
 * Runs a single test case.
 * @private
 */
async function runSingleTest(code, language, runner, input, expectedOutput) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesync-'));
  const srcFile = path.join(tmpDir, `solution${runner.ext}`);
  const outFile = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

  try {
    fs.writeFileSync(srcFile, code);

    if (runner.compile) {
      const [cmpCmd, cmpArgs] = runner.compile(srcFile, outFile);
      const compileResult = await executeWithTimeout(cmpCmd, cmpArgs, tmpDir, null, TEST_TIMEOUT);
      if (compileResult.exitCode !== 0) {
        return {
          passed: false,
          input,
          expected: expectedOutput,
          actual: '',
          error: compileResult.stderr || 'Compilation failed',
        };
      }
    }

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
      if (stdout.length > 50000) proc.kill();
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

export default { generateProblem, validateSolution };
