# Relay — Research → Planner — 2026-04-15

role:planner

## Context

A research session analyzed the Freehold SPEC (a Chrome MV3 extension for structured competitive audits of SaaS products) against Athanor's building blocks and recipes. The architecture, block selection, data model, Crann config, capture flow, storage strategy, permissions, and risks were all worked through. Several spec overrides were decided (React over vanilla, shadow DOM over popup, Crann-only communication, auto-save, project-based storage with Downloads write-through). The output is `docs/freehold/freehold-research.md`.

## Load these files
- `.context/PROJECT.md`
- `.context/PROTOCOL.md`
- `docs/AI.md`
- `docs/BLOCKS.md`
- `docs/freehold/SPEC.md`
- `docs/freehold/freehold-research.md`
- `recipes/shadow-crann/README.md`

## State
Branch: n/a
Build: n/a
TASKS.md current: n/a

## What was done
- Analyzed every Athanor block against Freehold requirements; selected `shadow-dom-mount`, `state/crann`, and `manifest/templates/base`
- Decided shadow DOM + Crann over iframe + typed-messages (Crann-only communication, no sendMessage/onMessage)
- Designed Crann config: `projects` map (Record<string, ProjectData> with taxonomy + captures nested per project, Persist.Local) + `activeProjectId` + `active` (per-tab). 10 RPC actions.
- Confirmed OffscreenCanvas works in MV3 service workers for screenshot cropping (no Offscreen Document API needed)
- Confirmed `activeTab` is insufficient for `captureVisibleTab` from a UI button — `<all_urls>` host permission required
- Confirmed `chrome.downloads.download()` auto-creates subdirectories and supports `conflictAction: 'overwrite'`
- Designed auto-save UX: no save buttons, every action persists immediately (three writes: Crann state, chrome.storage.local, Downloads)
- Content script uses dynamic injection (`chrome.scripting.executeScript` on action click), not declarative `content_scripts`
- Mapped 7 risks with mitigations; identified 6 open issues for the planner
- Produced `docs/freehold/freehold-research.md` (full research document)

## Your task
Create the initiative at `initiatives/freehold/`. Write BRIEF.md, PLAN.md, and TASKS.md per the protocol.

The research document (`docs/freehold/freehold-research.md`) is the primary input. It contains the architecture, block selection, data model, Crann config, capture flow, storage strategy, permissions, risks, and open issues. The original spec (`docs/freehold/SPEC.md`) is context but the research document takes precedence where they differ — the "Decisions Made (Spec Overrides)" table documents all deviations.

Address the 6 open issues listed in the research document's "Open Issues for Initiative Planning" section when writing the plan. The two highest-risk items (OffscreenCanvas cropping path, file drop in shadow DOM) should be spiked early in the task list.

## Open questions
1. **Filename generation strategy** — how to generate slugs from taxonomy labels (kebab-case, nested path like `leasing-lease-templates`). Decide a rule.
2. **Blob URL lifecycle** — verify `URL.createObjectURL()` works in service worker for `chrome.downloads.download()`. Fallback is data URLs.
3. **CSS strategy** — inline styles vs CSS-in-JS vs injected stylesheet in the shadow root.
4. **Panel dimensions** — default size and position. Resizable/draggable or fixed?
5. **Category picker design** — hierarchical dropdown vs tree-select vs two-level dropdowns.
6. **Content script injection** — confirm on-demand injection pattern (no declarative `content_scripts`).
