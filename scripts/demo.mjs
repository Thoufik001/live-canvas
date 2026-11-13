#!/usr/bin/env node
// Simulates parallel workers building a landing page in parallel.
//   node demo.mjs [--port=4777]
const port = (process.argv.find((a) => a.startsWith('--port=')) || '--port=4777').split('=')[1];
const base = `http://localhost:${port}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (op) => fetch(base + '/op', { method: 'POST', body: JSON.stringify(op) });

// no agent names: the canvas derives Layout / Content / Media / Style from what each op does
const A = (_who, id, parent, css, extra = {}) => post({ op: 'add', id, parent, css, ...extra });
const R = (_who, ...ids) => post({ op: 'reveal', ids });

await fetch(base + '/reset', { method: 'POST' });
await sleep(200);

await post({ op: 'page', title: 'Fernwood Coffee', width: 1040, bg: '#faf7f2', color: '#1f1a14',
  font: '15px/1.5 -apple-system, "Inter", system-ui, sans-serif' });

/* skeleton first */
const line = '1px solid #e6dfd3';
await A('Alma', 'nav', 'root', `display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:${line}`, { tag: 'header', say: 'laying out sections' });
await A('Alma', 'hero', 'root', 'display:grid;grid-template-columns:1.1fr .9fr;gap:40px;padding:64px 40px;align-items:center', { tag: 'section' });
await A('Alma', 'features', 'root', 'display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:8px 40px 64px', { tag: 'section' });
await A('Alma', 'footer', 'root', `display:flex;justify-content:space-between;padding:28px 40px;border-top:${line};color:#7a6f61;font-size:13px`, { tag: 'footer' });

const alma = async () => {
  await A('Alma', 'logo', 'nav', 'font:700 22px Georgia,serif;letter-spacing:-.01em', { text: 'Fernwood' });
  await A('Alma', 'links', 'nav', 'display:flex;gap:28px;color:#5b5145;font-size:14px');
  for (const [i, t] of ['Beans', 'Subscriptions', 'Journal'].entries()) await A('Alma', 'l' + i, 'links', '', { tag: 'a', text: t });
  await A('Alma', 'shop', 'nav', 'background:#1f1a14;color:#faf7f2;padding:9px 16px;border-radius:999px;font-weight:600;font-size:14px', { text: 'Shop beans' });
  await R('Alma', 'links', 'nav');
};

const bruno = async () => {
  await A('Bruno', 'copy', 'hero', 'display:flex;flex-direction:column;gap:20px');
  await A('Bruno', 'eyebrow', 'copy', 'font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.12em;color:#b4532a', { text: 'SMALL-BATCH · ROASTED IN LISBON' });
  await A('Bruno', 'h1', 'copy', 'font:600 56px/1.04 Georgia,serif;letter-spacing:-.02em;margin:0', { text: 'Coffee that tastes like the farm it came from.' });
  await A('Bruno', 'sub', 'copy', 'font-size:18px;color:#5b5145;max-width:460px', { text: 'Twelve single-origin beans a week, roasted to order, shipped in 48 hours — with the name of the person who grew them.' });
  await A('Bruno', 'actions', 'copy', 'display:flex;gap:12px;margin-top:6px');
  await A('Bruno', 'b1', 'actions', 'background:#b4532a;color:#fff;padding:13px 22px;border-radius:999px;font-weight:600', { text: 'Start a subscription' });
  await A('Bruno', 'b2', 'actions', 'border:1px solid #cfc4b3;padding:13px 22px;border-radius:999px;font-weight:600', { text: 'Browse the beans' });
  await R('Bruno', 'actions', 'copy');
};

const cleo = async () => {
  await A('Cleo', 'art', 'hero', 'position:relative;aspect-ratio:4/5;border-radius:22px;background:radial-gradient(circle at 30% 18%,#f3bd8a,#c2552b 55%,#3b1d12);box-shadow:0 30px 60px -30px rgba(60,30,10,.55)', { media: true, say: 'drawing hero visual' });
  await A('Cleo', 'badge', 'art', 'position:absolute;left:16px;bottom:16px;background:rgba(250,247,242,.94);padding:8px 12px;border-radius:10px;font:600 12px ui-monospace,Menlo,monospace', { text: 'Ethiopia · Guji · 1,950 m' });
  await R('Cleo', 'art');
};

const card = (who, n, kicker, title, body) => async () => {
  await A(who, 'c' + n, 'features', `background:#fff;border:${line};border-radius:16px;padding:24px;display:flex;flex-direction:column;gap:10px;min-height:150px`);
  await A(who, `c${n}k`, 'c' + n, 'font:600 11px ui-monospace,Menlo,monospace;letter-spacing:.1em;color:#b4532a', { text: kicker });
  await A(who, `c${n}t`, 'c' + n, 'font:600 22px Georgia,serif', { text: title });
  await A(who, `c${n}b`, 'c' + n, 'color:#5b5145;font-size:14px', { text: body });
  await R(who, 'c' + n);
};

const elio = async () => {
  await A('Elio', 'f1', 'footer', '', { text: 'Fernwood Roasters · Rua das Flores 12, Lisbon' });
  await A('Elio', 'f2', 'footer', '', { text: 'Free shipping over €30' });
  await R('Elio', 'footer');
};

await sleep(300);
await Promise.all([
  alma(), bruno(), cleo(),
  card('Dante', 1, '01 — FRESH', 'Roasted to order', 'Nothing sits on a shelf. Your beans are roasted the day before they ship.')(),
  card('Frida', 2, '02 — TRACEABLE', 'Know the farm', 'Every bag names the grower, the altitude and the harvest.')(),
  card('Gael', 3, '03 — FLEXIBLE', 'Pause anytime', 'Skip a week, swap beans or cancel in two taps. No emails to write.')(),
  elio(),
]);
await R('Alma', 'nav', 'hero', 'features');
await post({ op: 'done', message: 'Fernwood landing page — design complete' });
console.log('demo ops sent');
