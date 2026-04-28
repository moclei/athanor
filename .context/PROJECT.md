# Project

## What This Is

Athanor is a composable browser extension primitives library with an AI assembly layer. It provides typed, opinionated building blocks — content scripts, service workers, messaging layers, UI mounts — that an AI agent reads and uses to assemble working MV3 browser extensions. It replaces generator scripts and CLI tooling with structured documentation and self-contained primitives, designed to be wired together by AI rather than by hand.

## Where Things Live

- `blocks/` — composable primitives, organised by component type (content-script, service-worker, messaging, popup-ui, state, settings-page, manifest)
- `docs/AI.md` — consumer-facing assembly guide; the primary document an AI reads to compose extensions
- `docs/BLOCKS.md` — catalog of all available blocks with usage notes
- `docs/DECISIONS.md` — opinionated rationale for architectural choices
- `recipes/` — pre-assembled block combinations for common extension patterns
- `workspace/` — gitignored; where extensions are incubated locally before graduating to their own repos. Has its own `CONTEXT.md`; each extension inside (e.g. `workspace/freehold/`) also has one with architecture and file layout details
- `.context/` — developer workflow docs (this file, PROTOCOL.md, LENSOR_ANALYSIS.md)
- `initiatives/` — active and historical initiative folders

## Active Initiatives

- `initiatives/freehold/` — build a structured competitive audit capture extension using the `shadow-crann` recipe
- `initiatives/lensor-extraction/` — extract reusable blocks from Lensor/Crann into Athanor (Phases 1–3 complete; Phase 4 next)

## Completed Initiatives

- `initiatives/foundation/` — repo structure, core blocks, and initial AI.md

---

## Context Hierarchy

Context is loaded on demand, not all at once. Significant directories have a `CONTEXT.md` that acts as a local index.

| Path                   | Scope                                                          |
| ---------------------- | -------------------------------------------------------------- |
| `.context/PROJECT.md`  | This file — root orientation                                   |
| `.context/PROTOCOL.md` | Initiative workflow, agent roles, handoff protocol, escalation |
| `<dir>/CONTEXT.md`     | Domain-specific context for that directory — load on demand    |

Before reading source files in a directory you haven't visited this session, check for a `CONTEXT.md` there first.

Do not create `CONTEXT.md` files mid-task. If a directory you touched would benefit from one, note it in HANDOFF.md under Open Issues. For a full audit, use `role:organizer` as defined in the PROTOCOL.md.

---
