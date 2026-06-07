#!/usr/bin/env node
/**
 * dev-start.js — One-command development server launcher.
 *
 * Starts all required services in parallel:
 *   1. nats-server       (NATS message broker)
 *   2. pv_bridge.py      (Python engine bridge → 4pchess / 4pcheckmate)
 *   3. npm run dev       (Vite + Vike dev server)
 *
 * Press Ctrl+C to stop all services cleanly.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname);

// ── Configuration ──────────────────────────────────────────────────────────────

const NATS_SERVER = resolve(ROOT, 'nats-server');
const PV_BRIDGE  = resolve(ROOT, 'pv_bridge.py');
const VENV_PYTHON = resolve(ROOT, 'venv', 'bin', 'python');

// Color codes for terminal output
const COLORS = {
  nats:  '\x1b[36m',  // cyan
  py:    '\x1b[33m',  // yellow
  vite:  '\x1b[32m',  // green
  reset: '\x1b[0m',
  dim:   '\x1b[2m',
  red:   '\x1b[31m',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function label(name, color) {
  return `${color}[${name}]${COLORS.reset}`;
}

function checkPrerequisites() {
  const errors = [];

  if (!existsSync(NATS_SERVER)) {
    errors.push(`nats-server not found at ${NATS_SERVER}`);
  }

  if (!existsSync(PV_BRIDGE)) {
    errors.push(`pv_bridge.py not found at ${PV_BRIDGE}`);
  }

  if (!existsSync(VENV_PYTHON)) {
    // Fall back to system python3
    console.log(`${label('warn', COLORS.red)} venv python not found, will use system python3`);
  }

  if (errors.length > 0) {
    console.error(`${label('error', COLORS.red)} Missing prerequisites:`);
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}

// ── Process management ────────────────────────────────────────────────────────

const processes = [];

function spawnService(name, color, command, args, env = {}) {
  const cmd = existsSync(command) ? command : command; // resolved path or bare command

  console.log(`${label(name, color)} Starting: ${cmd} ${args.join(' ')}`);

  const proc = spawn(cmd, args, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });

  // Prefix stdout
  proc.stdout.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`${label(name, color)} ${line}`);
    }
  });

  // Prefix stderr
  proc.stderr.on('data', (data) => {
    const lines = data.toString().trimEnd().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`${label(name, COLORS.red)} ${line}`);
    }
  });

  proc.on('error', (err) => {
    console.error(`${label(name, COLORS.red)} Failed to start: ${err.message}`);
  });

  proc.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${label(name, color)} Killed (${signal})`);
    } else if (code !== 0 && code !== null) {
      console.log(`${label(name, COLORS.red)} Exited with code ${code}`);
    } else {
      console.log(`${label(name, color)} Stopped`);
    }
  });

  processes.push({ name, proc });
  return proc;
}

function killAll() {
  console.log(`\n${label('dev', COLORS.dim)} Shutting down...`);
  for (const { name, proc } of processes) {
    if (!proc.killed) {
      proc.kill('SIGTERM');
    }
  }
  // Force-kill after 5s
  setTimeout(() => {
    for (const { name, proc } of processes) {
      if (!proc.killed) proc.kill('SIGKILL');
    }
    process.exit(0);
  }, 5000);
}

// ── Main ──────────────────────────────────────────────────────────────────────

checkPrerequisites();

console.log(`${label('dev', COLORS.dim)} Starting development services...\n`);

// 1. NATS server
spawnService('nats', COLORS.nats, NATS_SERVER, ['--addr', '0.0.0.0', '--port', '4222']);

// 2. Python engine bridge
const pythonBin = existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
spawnService('py', COLORS.py, pythonBin, [PV_BRIDGE]);

// 3. Vite dev server (give NATS a moment to start)
setTimeout(() => {
  spawnService('vite', COLORS.vite, 'npm', ['run', 'dev']);
}, 1500);

// Graceful shutdown
process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

console.log(`\n${label('dev', COLORS.dim)} Press Ctrl+C to stop all services\n`);
