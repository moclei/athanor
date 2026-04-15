# Lensor Extraction Initiative

## Intent

Lensor is a published Chrome extension (`../lensor/`) built on Crann (`../crann/`), the author's own state-sync library. Together they demonstrate the exact patterns that were deferred in the foundation initiative: Shadow DOM injection, cross-context state sync, Chrome Alarms-based inactivity timeout, and a full extension settings page.

This initiative formalises the analysis of both projects and extracts their reusable architecture into new Athanor building blocks.

## Goals

- A `LENSOR_ANALYSIS.md` in `.context/` that maps Lensor/Crann architecture to Athanor block concepts — the canonical reference for any future AI agent working on this initiative
- Four new blocks:
  - `blocks/state/crann/` — the full Crann hub-and-spokes pattern (config, service worker hub, client agent, React hooks)
  - `blocks/content-script/shadow-dom-mount/` — Shadow DOM injection variant (complements the existing `iframe-mount`)
  - `blocks/service-worker/with-alarms/` — Chrome Alarms inactivity timeout utility
  - `blocks/settings-page/react/` — full extension settings page scaffold
- One new recipe: `recipes/shadow-crann/` — the Lensor-style stack wiring guide
- `docs/AI.md` and `docs/BLOCKS.md` updated to reflect all new blocks (no remaining "deferred" flags for implemented blocks)

## Scope

**In:**
- `athanor/.context/LENSOR_ANALYSIS.md`
- `blocks/state/crann/` — BLOCK.md + 3 annotated template files
- `blocks/content-script/shadow-dom-mount/` — BLOCK.md + index.ts
- `blocks/service-worker/with-alarms/` — BLOCK.md + index.ts
- `blocks/settings-page/react/` — BLOCK.md + scaffold files
- `recipes/shadow-crann/README.md`
- `docs/AI.md` and `docs/BLOCKS.md` updates

**Out:**
- A workspace PoC extension (deferred — blocks and recipe are sufficient)
- `popup-ui/vanilla` block (still deferred)
- Crann DevTools or advanced features
- Any changes to Lensor or Crann source

## Constraints

- **Read from source, don't guess** — Lensor and Crann are accessible at `../lensor/` and `../crann/` from the athanor root; always read the actual source before writing a block
- **Block templates must be annotated** — every placeholder in template files must be clearly marked with what the consumer must provide (e.g. `// TODO: replace with your extension name`)
- **`blocks/state/crann/` is templates, not runnable code** — its files are starting points an extension copies in, not an importable library
- **Follow existing BLOCK.md format** — read at least one existing BLOCK.md before writing a new one
- **MV3 only, TypeScript only** — consistent with all other Athanor blocks
- **No cross-block imports in the library** — each block is self-contained
