#!/usr/bin/env node
// Live Canvas server — zero dependencies.
//
//   node server.mjs [--port=4777] [--stream=.live-canvas/stream.jsonl] [--keep]
//
// Agents append one JSON op per line to the stream file (or POST to /op).
// The server tails the file and pushes every op to connected canvases over SSE.
// Late joiners and reconnects get the full history replayed.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const PORT = Number(args.port || process.env.LC_PORT || 4777);
const STREAM = path.resolve(args.stream || process.env.LC_STREAM || '.live-canvas/stream.jsonl');
const CANVAS = path.join(here, '..', 'canvas', 'index.html');
const BOOT = Date.now().toString(36);

fs.mkdirSync(path.dirname(STREAM), { recursive: true });
if (!args.keep || !fs.existsSync(STREAM)) fs.writeFileSync(STREAM, '');

let seq = 0;
const history = []; // {seq, op}
const clients = new Set();

function broadcast(op) {
  const item = { seq: ++seq, op };
  history.push(item);
  if (history.length > 50000) history.shift();
  const frame = `id: ${item.seq}\ndata: ${JSON.stringify(op)}\n\n`;
  for (const res of clients) res.write(frame);
}

// ---- tail the stream file (polling is more reliable than fs.watch on macOS) ----
let offset = 0;
let partial = '';
function drain() {
  let size;
  try {
    size = fs.statSync(STREAM).size;
  } catch {
    return;
  }
  if (size < offset) {
    offset = 0;
    partial = '';
  }
  if (size === offset) return;
  const fd = fs.openSync(STREAM, 'r');
  const buf = Buffer.alloc(size - offset);
  fs.readSync(fd, buf, 0, buf.length, offset);
  fs.closeSync(fd);
  offset = size;
  const lines = (partial + buf.toString('utf8')).split('\n');
  partial = lines.pop(); // last piece may be an incomplete line
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      broadcast(JSON.parse(t));
    } catch {
      console.error('skipped invalid line:', t.slice(0, 120));
    }
  }
}
setInterval(drain, 70);

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(CANVAS));
  }

  if (req.method === 'GET' && url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`: ok\n\nevent: hello\ndata: ${JSON.stringify({ boot: BOOT })}\n\n`);
    const last = Number(req.headers['last-event-id'] || 0);
    for (const item of history) {
      if (item.seq > last) res.write(`id: ${item.seq}\ndata: ${JSON.stringify(item.op)}\n\n`);
    }
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/op') {
    // Accepts one JSON object, a JSON array, or NDJSON. Goes through the stream
    // file so there is a single ordered path and a durable log.
    const body = (await readBody(req)).trim();
    let ops = [];
    try {
      const j = JSON.parse(body);
      ops = Array.isArray(j) ? j : [j];
    } catch {
      for (const line of body.split('\n')) {
        try {
          if (line.trim()) ops.push(JSON.parse(line));
        } catch {}
      }
    }
    if (ops.length) fs.appendFileSync(STREAM, ops.map((o) => JSON.stringify(o)).join('\n') + '\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ accepted: ops.length }));
  }

  if (req.method === 'POST' && url.pathname === '/reset') {
    fs.writeFileSync(STREAM, '');
    offset = 0;
    partial = '';
    history.length = 0;
    broadcast({ op: 'reset' });
    res.writeHead(200);
    return res.end('ok');
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ops: seq, clients: clients.size, stream: STREAM }));
  }

  res.writeHead(404);
  res.end('not found');
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Is a Live Canvas server already running? (try --port=...)`);
  } else console.error(e);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Live Canvas  →  http://localhost:${PORT}`);
  console.log(`Append ops to →  ${STREAM}`);
});
