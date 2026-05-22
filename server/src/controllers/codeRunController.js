/**
 * @module controllers/codeRunController
 * @description Handles code execution requests. Spawns child processes 
 * to compile/run code in supported languages with timeout protection.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

/** Maximum execution time in ms */
const TIMEOUT = 15000;

/** Map language → how to run */
const RUNNERS = {
  javascript: { ext: '.js', cmd: (f) => ['node', [f]] },
  python:     { ext: '.py', cmd: (f) => ['python', [f]] },
  cpp:        { ext: '.cpp', compile: (f, o) => ['g++', [f, '-o', o]], cmd: (f, o) => [o, []] },
  c:          { ext: '.c',   compile: (f, o) => ['gcc', [f, '-o', o]], cmd: (f, o) => [o, []] },
  typescript: { ext: '.ts', cmd: (f) => ['npx', ['tsx', f]] },
  java:       { ext: '.java', cmd: (f) => ['java', [f]] },
  go:         { ext: '.go', cmd: (f) => ['go', ['run', f]] },
  rust:       { ext: '.rs', compile: (f, o) => ['rustc', [f, '-o', o]], cmd: (f, o) => [o, []] },
  shell:      { ext: '.sh', cmd: (f) => ['bash', [f]] },
  powershell: { ext: '.ps1', cmd: (f) => ['powershell', ['-File', f]] },
};

/**
 * Check if a command exists on the system.
 */
function commandExists(cmd) {
  try {
    const check = os.platform() === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    execSync(check, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * POST /api/code/run
 * Executes code in a sandboxed temp file.
 * Body: { code: string, language: string, input?: string }
 * Returns: { stdout: string, stderr: string, exitCode: number, duration: number }
 */
export async function runCode(req, res, next) {
  const { code, language, input } = req.body;

  if (!code || !language) {
    return res.status(400).json({
      success: false,
      error: 'Code and language are required.',
    });
  }

  const runner = RUNNERS[language];
  if (!runner) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: ${language}. Supported: ${Object.keys(RUNNERS).join(', ')}`,
    });
  }

  // Create temp directory for execution
  const tmpDir = path.join(os.tmpdir(), `codesync-${uuidv4()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const srcFile = path.join(tmpDir, `main${runner.ext}`);
  const outFile = path.join(tmpDir, os.platform() === 'win32' ? 'main.exe' : 'main');

  try {
    // Write source code to temp file
    fs.writeFileSync(srcFile, code, 'utf-8');

    // Compile if needed (C, C++, Rust)
    if (runner.compile) {
      const [compileCmd, compileArgs] = runner.compile(srcFile, outFile);

      if (!commandExists(compileCmd)) {
        return res.json({
          success: true,
          data: {
            stdout: '',
            stderr: `Error: '${compileCmd}' not found. Please install it to compile ${language} code.`,
            exitCode: 1,
            duration: 0,
          },
        });
      }

      const compileResult = await executeProcess(compileCmd, compileArgs, tmpDir, null, TIMEOUT);
      if (compileResult.exitCode !== 0) {
        return res.json({
          success: true,
          data: {
            stdout: '',
            stderr: `Compilation Error:\n${compileResult.stderr}`,
            exitCode: compileResult.exitCode,
            duration: compileResult.duration,
          },
        });
      }
    }

    // Run the code
    const [runCmd, runArgs] = runner.cmd(srcFile, outFile);

    // Only check commandExists for interpreters, not compiled binaries
    if (!runner.compile && !commandExists(runCmd)) {
      return res.json({
        success: true,
        data: {
          stdout: '',
          stderr: `Error: '${runCmd}' not found. Please install it to run ${language} code.`,
          exitCode: 1,
          duration: 0,
        },
      });
    }

    const result = await executeProcess(runCmd, runArgs, tmpDir, input || null, TIMEOUT);

    res.json({
      success: true,
      data: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration: result.duration,
      },
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        stdout: '',
        stderr: `Execution error: ${error.message}`,
        exitCode: 1,
        duration: 0,
      },
    });
  } finally {
    // Clean up temp files
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* ignore cleanup errors */ }
  }
}

/**
 * Spawns a process and captures output.
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number, duration: number}>}
 */
function executeProcess(cmd, args, cwd, stdinData, timeout) {
  return new Promise((resolve) => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';
    let killed = false;

    const proc = spawn(cmd, args, {
      cwd,
      timeout,
      env: { ...process.env, NODE_ENV: 'production' },
      shell: true,
    });

    // Send stdin if provided
    if (stdinData) {
      proc.stdin.write(stdinData);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      // Limit output to 50KB
      if (stdout.length > 50000) {
        stdout = stdout.slice(0, 50000) + '\n... (output truncated)';
        proc.kill();
        killed = true;
      }
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      if (stderr.length > 50000) {
        stderr = stderr.slice(0, 50000) + '\n... (output truncated)';
      }
    });

    proc.on('close', (code) => {
      const duration = Date.now() - start;
      if (killed) {
        stderr += '\nProcess output was truncated (exceeded 50KB limit).';
      }
      if (duration >= timeout) {
        stderr += `\nProcess timed out after ${timeout / 1000}s.`;
      }
      resolve({ stdout, stderr, exitCode: code ?? 1, duration });
    });

    proc.on('error', (err) => {
      resolve({
        stdout: '',
        stderr: `Failed to start process: ${err.message}`,
        exitCode: 1,
        duration: Date.now() - start,
      });
    });
  });
}
