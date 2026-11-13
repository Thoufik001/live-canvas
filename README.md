# live-canvas

Stop staring at a spinner while your coding agent builds. **Live Canvas** is a skill that lets you
watch the UI being designed in a browser tab as the agent works: named cursors draw frames, type
the copy, and fade in the styling, section by section.

- **Layout** draws containers · **Content** types text · **Media** drops visuals · **Style** reveals the finished look
- Cursors fade out when their work is done and come back when there's more
- Replay, 1× / 2× / Instant, and an "Open real app" handoff when the build finishes

## How it works

The agent streams tiny, always-valid ops (`add`, `text`, `reveal`…) to `.live-canvas/stream.jsonl`.
A zero-dependency local server pushes them to the canvas page, which plays them back. It shows the
*design as it's decided*, not the compiled app, so it is never broken or half-built. The canvas runs
only on `localhost`; none of it ships with your app.

## Install

```bash
npx live-canvas install            # Claude Code: copies the skill to ~/.claude/skills
npx live-canvas install --project  # …or just this repo (.claude/skills)
```

Other agents (Codex, Cursor, …) using the community `skills` CLI:

```bash
npx skills add Thoufik001/live-canvas
```

Then ask your agent to build a UI **"with live-canvas"** (add `light` or `full` for the detail level).

## Try it without an agent

```bash
npx live-canvas start      # http://localhost:4777
npx live-canvas demo       # parallel cursors build a landing page
```

## Token cost

Every op is output tokens, and the design is described twice (ops, then real code).
`light` (default) streams only sections, headings and key copy; `full` streams everything.
See [SKILL.md](SKILL.md) for the exact rules. Costs are estimates from the demo page, not measurements.

## Optional: live presence in Claude Code

`scripts/hook.mjs` labels a cursor with what the agent is really doing ("editing Hero.tsx").
Hook setup is in [SKILL.md](SKILL.md).

## Status

Early prototype (v0.1). Tested with the bundled demo. Not yet tested across Codex or Cursor.

## License

MIT
