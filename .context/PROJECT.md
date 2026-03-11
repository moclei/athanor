# Project

## What This Is
Athanor is a composable browser extension primitives library with an AI assembly layer. It provides typed, opinionated building blocks — content scripts, service workers, messaging layers, UI mounts — that an AI agent reads and uses to assemble working MV3 browser extensions. It replaces generator scripts and CLI tooling with structured documentation and self-contained primitives, designed to be wired together by AI rather than by hand.

## Where Things Live
- `blocks/` — composable primitives, organised by component type (content-script, service-worker, messaging, popup-ui, manifest)
- `docs/AI.md` — consumer-facing assembly guide; the primary document an AI reads to compose extensions
- `docs/BLOCKS.md` — catalog of all available blocks with usage notes
- `docs/DECISIONS.md` — opinionated rationale for architectural choices
- `recipes/` — pre-assembled block combinations for common extension patterns
- `workspace/` — gitignored; where extensions are incubated locally before graduating to their own repos
- `.context/` — developer workflow docs (this file, WORKFLOW.md, AGENTS.md)
- `initiatives/` — active and historical initiative folders

## Active Initiatives
- `initiatives/foundation/` — establish repo structure, core blocks, and initial AI.md

---

## System

This project uses a structured agent workflow. Read these before working:
- `.context/WORKFLOW.md` — initiative and document structure
- `.context/AGENTS.md` — roles, protocols, escalations

### Role Activation

By default, respond without a role. Be helpful, answer questions, assist naturally.

If the user begins their message with a role prefix, adopt that role fully for the session:

| Prefix | Role | Behaviour |
|---|---|---|
| `role:planner` | Planner | Create or revise initiative docs. See AGENTS.md. |
| `role:orchestrator` | Orchestrator | Run the Task tool loop for the named initiative. Unattended. See AGENTS.md. |

`role:orchestrator` always means unattended execution via the Task tool loop. It does not pause for confirmation between tasks. It stops only when all tasks are complete or an escalation condition is met.

The Worker role is never invoked by the user. Only the Orchestrator spawns Workers via the Task tool.

When a role is active:
- Announce it once at the start: *"Acting as [Role]."*
- Operate strictly within that role's responsibilities as defined in AGENTS.md
- Escalate according to the escalation paths in AGENTS.md
- When the role's work is complete, say so explicitly and stop
