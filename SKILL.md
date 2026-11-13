---
name: live-canvas
description: Lets the user watch a UI being designed live while you build it — named agent cursors draw frames, type copy and fade in styling in a browser tab, instead of the user staring at a spinner until the finished app appears. Use at the start of any task that builds a website, landing page, dashboard, app screen or other visual product from scratch (including long, multi-agent builds).
---

# Live Canvas

You stream your design to a canvas **as you decide it**, in tiny always-valid ops. The user watches
frames get drawn, text typed and styling applied by named cursors (one per agent). Then you write
the real code. The canvas shows the *design in progress*, not the compiled app, so it can never be
broken, mid-edit or blank.

## 1. Start (once, at the very beginning of the task)

```bash
node <skill-dir>/scripts/server.mjs &        # serves the canvas, tails .live-canvas/stream.jsonl
```

Add `.live-canvas/` to `.gitignore`. Open `http://localhost:4777` for the user (browser tool, or tell them the URL). Do this **before**
reading the codebase or writing code — the point is the user is watching from minute one.

## 2. Emit ops

Append one JSON object per line to `.live-canvas/stream.jsonl` in the project root. Batch several
lines per command; the canvas paces playback itself, so never add sleeps.

```bash
cat >> .live-canvas/stream.jsonl <<'EOF'
{"op":"page","title":"Fernwood","width":1040,"bg":"#faf7f2","font":"15px/1.5 system-ui"}
{"op":"add","id":"nav","parent":"root","tag":"header","css":"display:flex;padding:20px 40px"}
{"op":"add","id":"logo","parent":"nav","css":"font:700 22px Georgia","text":"Fernwood"}
{"op":"reveal","ids":["nav"]}
EOF
```

(Equivalent: `curl -s localhost:4777/op --data-binary @-`.)

| op | fields | does |
|---|---|---|
| `page` | `title width bg font color css` | sets up the sheet; send first |
| `add` | `id parent tag css text src attrs before hold reveal media say` | cursor drags a frame, then types `text`. Leaves (with `text`/`src`) reveal their styling automatically; containers stay as wireframes until `reveal` |
| `text` | `id text append` | types into an existing element |
| `set` | `id css attrs text` | edits an element in place |
| `reveal` | `id` or `ids` | applies the real styling (fade-in). Reveal a container **after** its children |
| `remove` | `id` | deletes an element |
| `presence` | `label` (optional `agent`) | status pill only ("reading tokens.css") |
| `done` | `message url` | waits for all cursors, reveals everything, shows "Open real app" if `url` given |
| `reset` | — | clears the canvas (`POST /reset` does the same) |

`css` is a plain inline-style string. `parent` is `root` or another element's `id`. `id`s must be unique.

## 3. How to build with it

1. **Skeleton first** (see *Detail level* below for how much to stream). Add the major containers (nav, hero, sections, footer) with layout CSS and
   realistic padding / `min-height` / `aspect-ratio` so frames have real size. This is the "layout appears" beat.
2. **Then fill, section by section.** Children, then their text. Small ops, many of them — the
   more granular you are, the more live it feels. Prefer concrete copy over lorem ipsum.
3. **Reveal containers** when their children are in. Reveal order = the order the page "comes to life".
4. **Don't name cursors — the canvas does it from the kind of work.** `add` of a container → **Layout**
   cursor; `add`/`text` with copy → **Content**; `add` with `src`/`media:true` (images, gradient
   visuals) → **Media**; `reveal`/style `set` → **Style**. They run concurrently, and a `reveal` waits
   until everything inside that element is filled. Only pass `agent` if you want an extra named
   lane (e.g. a real sub-agent), which overrides the role.
5. **Images:** use gradients / inline SVG data URIs / explicit `width`+`height`, never remote URLs
   that may be slow. Always give them a fixed size so layout doesn't jump.
6. **Stream the design you will actually implement**, then write the real code to match it. Keep ops
   ahead of the code so the canvas never waits on a build.
7. **Finish** with `{"op":"done","message":"…","url":"http://localhost:3000"}` once the
   real dev server is up. The user can hand off from the canvas to the real app.

Work with no visual output (installs, config, backend) → just emit a `presence` line now and then.
Don't fabricate UI ops for work that isn't happening.

## Detail level (controls token cost)

Every op is output tokens, and the design is described twice (ops, then real code). Pick a level from
the user's request ("live-canvas light" / "live-canvas full"); **default is `light`**.

| | `light` (~1–2k tokens per screen) | `full` (~3–6k tokens per screen) |
|---|---|---|
| Containers | major sections only (nav, hero, each section, footer) | every container, down to rows and cards |
| Text | headings, taglines, button labels, nav items — real copy, short | all visible copy, in full |
| Media | one `media:true` block per image/visual, gradient fill | same, plus captions/badges |
| Ops per command | one batch of 10–25 lines per section, no per-element commands | as many as needed |
| `reveal` | sections only | containers and sections |
| Skipped | paragraphs (emit a single short line of text), icons, spacing details, repeated list items beyond the first 2–3 | nothing |

Rules for both levels:
- Never narrate or re-explain the ops in chat; just run the command.
- One heredoc append per section, not one tool call per element.
- Skip ops entirely for small edits, bug fixes and non-visual work. Don't re-stream a screen you already streamed.
- A repeated element (cards, rows) → stream the first one or two, not all of them.
- In `light`, the real code is still complete; only the preview is abbreviated.

## Keep it out of the project

The canvas is a local preview page (`localhost:4777`); nothing in it ships with the user's app. Add
`.live-canvas/` to `.gitignore` when you start the server (if it isn't there already).

## Optional: live presence from Claude Code tool calls

`scripts/hook.mjs` is a hook that labels a cursor with what the agent is really doing ("editing
Hero.tsx", "running npm"). Add to `.claude/settings.json`:

```json
{ "hooks": { "PreToolUse": [ { "matcher": "Write|Edit|MultiEdit|Bash|Read",
  "hooks": [ { "type": "command", "command": "node <skill-dir>/scripts/hook.mjs" } ] } ] } }
```

## Try it without an agent

```bash
node <skill-dir>/scripts/server.mjs &
node <skill-dir>/scripts/demo.mjs     # parallel Layout / Content / Media / Style cursors build a landing page in parallel
```

Safety: the canvas is local-only (127.0.0.1), renders text via text nodes, and drops `<script>`,
`on*` handlers and `javascript:` URLs from ops.
