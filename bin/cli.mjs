#!/usr/bin/env node
// live-canvas CLI
//   npx live-canvas install [--project] [--dir=<skills-dir>]   copy the skill into your agent
//   npx live-canvas start   [--port=4777]                      run the canvas server
//   npx live-canvas demo    [--port=4777]                      stream a demo build

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd = 'help', ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter((a) => a.startsWith('--')).map((a) => {
  const [k, v] = a.slice(2).split('=');
  return [k, v ?? true];
}));

function run(script) {
  const child = spawn(process.execPath, [path.join(root, 'scripts', script), ...rest], { stdio: 'inherit' });
  child.on('exit', (c) => process.exit(c ?? 0));
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    e.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function install() {
  // Claude Code reads ~/.claude/skills (personal) or ./.claude/skills (project).
  const base = flags.dir
    ? path.resolve(flags.dir)
    : flags.project
      ? path.resolve('.claude/skills')
      : path.join(os.homedir(), '.claude', 'skills');
  const dest = path.join(base, 'live-canvas');
  fs.rmSync(dest, { recursive: true, force: true });
  for (const part of ['scripts', 'canvas']) copyDir(path.join(root, part), path.join(dest, part));
  // Resolve the <skill-dir> placeholder to the real installed path so the agent can run the scripts.
  const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8').replaceAll('<skill-dir>', dest);
  fs.writeFileSync(path.join(dest, 'SKILL.md'), skill);
  console.log(`Installed live-canvas skill → ${dest}`);
  console.log('Restart your agent session, then ask it to build a UI "with live-canvas".');
  console.log('Other agents (Codex, Cursor, …): npx skills add <owner>/live-canvas');
}

switch (cmd) {
  case 'install': install(); break;
  case 'start': run('server.mjs'); break;
  case 'demo': run('demo.mjs'); break;
  default:
    console.log(`live-canvas — watch your agent design the UI live

  npx live-canvas install [--project]   install the skill (default: ~/.claude/skills)
  npx live-canvas start [--port=4777]   run the canvas at http://localhost:4777
  npx live-canvas demo                  stream a demo build into the canvas`);
}
