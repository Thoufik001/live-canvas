#!/usr/bin/env node
// Optional Claude Code hook: turns tool activity into live "presence" on the canvas
// (a cursor labelled "editing Hero.tsx", "running npm", …). Never blocks the agent.
//
// Add to .claude/settings.json:
//   { "hooks": { "PreToolUse": [ { "matcher": "Write|Edit|MultiEdit|Bash|Read",
//       "hooks": [ { "type": "command", "command": "node /abs/path/live-canvas/scripts/hook.mjs" } ] } ] } }

import fs from 'node:fs';

const port = process.env.LC_PORT || 4777;
let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8'));
} catch {}

const tool = input.tool_name || '';
const args = input.tool_input || {};
const base = (p) => String(p || '').split('/').pop();

let label = null;
if (/^(Write|Edit|MultiEdit)$/.test(tool)) label = `editing ${base(args.file_path)}`;
else if (tool === 'Read') label = `reading ${base(args.file_path)}`;
else if (tool === 'Bash') label = `running ${String(args.command || '').trim().split(/\s+/).slice(0, 2).join(' ')}`;
else if (tool === 'Task' || tool === 'Agent') label = 'delegating';

if (label) {
  try {
    await fetch(`http://localhost:${port}/op`, {
      method: 'POST',
      body: JSON.stringify({ op: 'presence', agent: process.env.LC_AGENT || 'Claude', label }),
      signal: AbortSignal.timeout(250),
    });
  } catch {} // canvas not running → silently do nothing
}
process.exit(0);
