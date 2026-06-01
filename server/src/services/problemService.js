/**
 * @module services/problemService
 * @description Provides trusted coding challenges from the static database and validates
 * solutions by running code against test cases.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
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

export function getGenericStarterCode(language) {
  // If we have leetcode problems, the starter code is dynamically injected 
  // on the frontend via problem.starterCode.
  // This is just a fallback for older components.
  if (language === 'javascript' || language === 'typescript') {
    return `// Write your LeetCode style function here\n// Ensure you use module.exports = functionName;\n`;
  }
  return '// Write your solution here';
}

/**
 * Returns random coding challenges from the trusted database.
 */
export async function generateProblem(count = 1, difficulty = 'medium') {
  const problems = loadTrustedProblems();
  
  const available = problems.filter(p => p.difficulty === difficulty);
  const pool = available.length > 0 ? available : problems;

  if (pool.length === 0) {
    throw new Error("No trusted problems found in database.");
  }

  const selected = [];
  const poolCopy = [...pool];
  
  for (let i = 0; i < count; i++) {
    if (poolCopy.length === 0) break;
    const randIdx = Math.floor(Math.random() * poolCopy.length);
    const problem = poolCopy.splice(randIdx, 1)[0];
    selected.push({
      title: problem.title,
      description: problem.description,
      starterCode: problem.starterCode,
      testCases: problem.testCases,
    });
  }

  return selected;
}

/**
 * Validates a solution by running code against test cases.
 */
export async function validateSolution(code, language, problem, testCasesOverride = null) {
  const testCases = testCasesOverride || problem.testCases;
  const runner = RUNNERS[language];
  if (!runner) {
    return { passed: 0, total: testCases.length, results: [] };
  }

  // LEETCODE WRAPPER ENGINE
  // Batches all test cases into a single execution for ultra-fast validation
  if (language === 'javascript') {
    return await validateJavascriptLeetcode(code, testCases);
  }
  if (language === 'cpp' && problem.cppArgs) {
    return await validateCppLeetcode(code, problem, testCases);
  }

  // Fallback for other languages (sequential execution)
  const results = [];
  let passed = 0;
  for (const tc of testCases) {
    const inputStr = tc.inputs || tc.input;
    const result = await runSingleTest(code, language, runner, inputStr, tc.expectedOutput);
    results.push(result);
    if (result.passed) passed++;
  }

  return { passed, total: testCases.length, results };
}

function toCppValue(type, jsonVal) {
  if (type.startsWith('vector<vector<')) {
    const inner = type.slice(14, -2);
    return `{${jsonVal.map(v => toCppValue(`vector<${inner}>`, v)).join(', ')}}`;
  } else if (type.startsWith('vector<')) {
    const inner = type.slice(7, -1);
    return `{${jsonVal.map(v => toCppValue(inner, v)).join(', ')}}`;
  } else if (type === 'string') {
    return `"${jsonVal}"`;
  } else if (type === 'bool') {
    return jsonVal ? 'true' : 'false';
  } else {
    return String(jsonVal);
  }
}

async function validateCppLeetcode(code, problem, testCases) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesync-'));
  const srcFile = path.join(tmpDir, 'solution.cpp');
  const outFile = path.join(tmpDir, process.platform === 'win32' ? 'solution.exe' : 'solution');

  try {
    const argPairs = problem.cppArgs.split(',').map(s => s.trim());
    const argTypes = argPairs.map(p => p.split(' ')[0].replace('&', ''));

    let wrapper = `
#include <iostream>
#include <vector>
#include <string>
#include <chrono>

using namespace std;

// === USER CODE START ===
${code}
// === USER CODE END ===

void printCppValue(int v) { cout << v; }
void printCppValue(bool v) { cout << (v ? "true" : "false"); }
void printCppValue(const string& v) { cout << "\\"" << v << "\\""; }
template<typename T>
void printCppValue(const vector<T>& v) {
  cout << "[";
  for(size_t i=0; i<v.size(); ++i) { printCppValue(v[i]); if (i != v.size()-1) cout << ","; }
  cout << "]";
}

int main() {
  Solution sol;
`;

    testCases.forEach((tc, i) => {
      const inputs = typeof tc.inputs === 'string' ? JSON.parse(tc.inputs) : tc.inputs;
      
      wrapper += `  {\n    auto start = chrono::high_resolution_clock::now();\n    try {\n`;
      
      const argNames = [];
      argTypes.forEach((type, j) => {
        const valStr = toCppValue(type, inputs[j]);
        const name = `arg_${i}_${j}`;
        wrapper += `      ${type} ${name} = ${valStr};\n`;
        argNames.push(name);
      });
      
      wrapper += `      cout << "RESULT_START\\n";\n`;
      
      if (problem.cppRet === 'void') {
        wrapper += `      sol.${problem.functionName}(${argNames.join(', ')});\n`;
        wrapper += `      auto end = chrono::high_resolution_clock::now();\n`;
        wrapper += `      cout << chrono::duration_cast<chrono::milliseconds>(end - start).count() << "\\n";\n`;
        wrapper += `      printCppValue(${argNames[0]});\n`;
      } else {
        wrapper += `      auto res = sol.${problem.functionName}(${argNames.join(', ')});\n`;
        wrapper += `      auto end = chrono::high_resolution_clock::now();\n`;
        wrapper += `      cout << chrono::duration_cast<chrono::milliseconds>(end - start).count() << "\\n";\n`;
        wrapper += `      printCppValue(res);\n`;
      }
      
      wrapper += `      cout << "\\nRESULT_END\\n";\n`;
      wrapper += `    } catch (const std::exception& e) {\n`;
      wrapper += `      cout << "RESULT_START\\n-1\\n" << e.what() << "\\nRESULT_END\\n";\n`;
      wrapper += `    } catch (...) {\n`;
      wrapper += `      cout << "RESULT_START\\n-1\\nUnknown Error\\nRESULT_END\\n";\n`;
      wrapper += `    }\n`;
      wrapper += `  }\n`;
    });
    
    wrapper += `  return 0;\n}\n`;

    fs.writeFileSync(srcFile, wrapper);

    const compileResult = await executeWithTimeout('g++', ['-O2', srcFile, '-o', outFile], tmpDir, null, TEST_TIMEOUT);
    if (compileResult.exitCode !== 0) {
      return {
        passed: 0,
        total: testCases.length,
        results: testCases.map(tc => ({
          passed: false,
          input: tc.inputs,
          expected: tc.expectedOutput,
          actual: '',
          error: compileResult.stderr || compileResult.stdout || 'Compilation failed',
          timeMs: 0
        }))
      };
    }

    const runResult = await executeWithTimeout(outFile, [], tmpDir, null, TEST_TIMEOUT);
    const output = runResult.stdout;
    
    const results = [];
    let passedCount = 0;
    
    // Parse the output
    let currentTcIndex = 0;
    const blocks = output.split('RESULT_START\\n');
    for (let i = 1; i < blocks.length; i++) {
      if (currentTcIndex >= testCases.length) break;
      const tc = testCases[currentTcIndex];
      const blockContent = blocks[i].split('\\nRESULT_END')[0];
      const lines = blockContent.split('\\n');
      
      const timeMs = parseInt(lines[0], 10);
      let actual = '';
      let error = '';
      
      if (timeMs === -1) {
        error = lines.slice(1).join('\\n');
      } else {
        actual = lines.slice(1).join('\\n').trim();
      }
      
      // Compare output without spaces for robustness
      const expectedStr = tc.expectedOutput.replace(/\\s/g, '');
      const actualStr = actual.replace(/\\s/g, '');
      const isPassed = error === '' && actualStr === expectedStr;
      if (isPassed) passedCount++;
      
      results.push({
        passed: isPassed,
        input: tc.inputs,
        expected: tc.expectedOutput,
        actual: actual,
        error: error,
        timeMs: Math.max(0, timeMs)
      });
      currentTcIndex++;
    }
    
    // Fill in any missing ones due to timeout/crash
    while (results.length < testCases.length) {
      const tc = testCases[results.length];
      results.push({
        passed: false,
        input: tc.inputs,
        expected: tc.expectedOutput,
        actual: '',
        error: runResult.stderr || 'Execution crashed or timed out.',
        timeMs: 0
      });
    }

    return { passed: passedCount, total: testCases.length, results };

  } catch (error) {
    console.error('C++ validation error:', error);
    return { passed: 0, total: testCases.length, results: [] };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

async function validateJavascriptLeetcode(code, testCases) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codesync-'));
  const solutionFile = path.join(tmpDir, 'solution.js');
  const wrapperFile = path.join(tmpDir, 'wrapper.js');
  const tcsFile = path.join(tmpDir, 'testcases.json');

  try {
    fs.writeFileSync(solutionFile, code);
    fs.writeFileSync(tcsFile, JSON.stringify(testCases));

    const wrapperCode = `
      const fs = require('fs');
      const { performance } = require('perf_hooks');
      
      try {
        const userFunc = require('./solution.js');
        const tcs = JSON.parse(fs.readFileSync('./testcases.json', 'utf8'));
        const results = [];
        
        for (const tc of tcs) {
          const inputs = JSON.parse(tc.inputs);
          const expectedStr = tc.expectedOutput;
          
          const start = performance.now();
          let actual;
          let error = '';
          
          try {
            actual = userFunc(...inputs);
          } catch (e) {
            error = e.message;
          }
          
          const timeMs = Math.round(performance.now() - start);
          const actualStr = JSON.stringify(actual);
          const passed = error === '' && actualStr === expectedStr;
          
          results.push({
            passed,
            input: tc.inputs,
            expected: expectedStr,
            actual: actualStr || '',
            error,
            timeMs
          });
        }
        
        console.log(JSON.stringify(results));
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    `;
    
    fs.writeFileSync(wrapperFile, wrapperCode);

    const cmd = 'node';
    const args = [wrapperFile];
    // Allow up to TEST_TIMEOUT total for the batch
    const result = await executeWithTimeout(cmd, args, tmpDir, null, TEST_TIMEOUT);

    if (result.exitCode !== 0) {
      return {
        passed: 0,
        total: testCases.length,
        results: testCases.map(tc => ({
          passed: false,
          input: tc.inputs,
          expected: tc.expectedOutput,
          actual: '',
          error: result.stderr || result.stdout || 'Syntax Error'
        }))
      };
    }

    const parsedResults = JSON.parse(result.stdout.trim());
    const passedCount = parsedResults.filter(r => r.passed).length;
    
    return { passed: passedCount, total: testCases.length, results: parsedResults };

  } catch (error) {
    console.error('Validation error:', error);
    return { passed: 0, total: testCases.length, results: [] };
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore */ }
  }
}

/**
 * Runs a single test case (Legacy Fallback for other languages)
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
