# Relay — Planner → Orchestrator — 2026-04-28

role:orchestrator

## Context

Freehold is a working Chrome MV3 extension (initiative complete and merged to main). The user surfaced five UX improvements from real use: hide auto-generated filename, draggable panel, click-to-place selection, group-based subfolder export, and inline Quick-Add taxonomy from the Capture tab. Planning is complete; all three open questions are resolved.

## Load these files

- .context/PROJECT.md
- .context/PROTOCOL.md
- initiatives/freehold-enhancements/BRIEF.md
- initiatives/freehold-enhancements/PLAN.md
- initiatives/freehold-enhancements/TASKS.md
- workspace/freehold/CONTEXT.md
- workspace/freehold/types.ts
- workspace/freehold/config.ts
- workspace/freehold/config.sw.ts
- workspace/freehold/ui/App.tsx
- workspace/freehold/ui/components/CategoryPicker.tsx
- workspace/freehold/ui/components/CaptureCard.tsx
- workspace/freehold/ui/components/RegionSelectionOverlay.tsx
- workspace/freehold/ui/gallery/export-project.ts
- workspace/freehold/content-script/panel-styles.ts

## State

Branch: `main` (dirty: one unrelated modified file `.context/PROJECT.md`)
Build: passing (`npm run build` in `workspace/freehold/`)
TASKS.md current: yes — single phase, five features, all `[ ]`

## What was done

- Created `initiatives/freehold-enhancements/` with BRIEF.md, PLAN.md, TASKS.md.
- Confirmed scope: five small UX enhancements to the existing extension; one phase; ~7 files; one session.
- Resolved Open Question #1: subfolder = top-level taxonomy group only (`slugify(taxonomyPath[0])`), regardless of how deep the tagged node sits.
- Resolved Open Question #2: subfolder export lives in `ui/gallery/export-project.ts` (File System Access API). The original BRIEF mentioned `chrome.downloads` write-through, but that mechanism was removed earlier in favour of IndexedDB + gallery export. No capture-time downloads are introduced.
- Resolved Open Question #3: Quick-Add affordance in the picker is scoped to top-level groups only. Arbitrary depth IS supported by the data model and the Taxonomy tab UI ("Add Child" in `⋮` menu); this constraint is purely for the Capture tab picker.
- Confirmed `CategoryPicker` becomes a custom React popover (anchored, inline, no scrim) — not a modal.
- Added a fifth feature mid-planning: click-to-place region selection as an alternative to mouse-down-drag. Designed as an implicit hybrid (no mode toggle): drag works as today; if mousedown→mouseup with no significant motion, the overlay enters a "follow" state where the selection grows with the cursor without a button held; the next click commits.
- Composite SW action `quickAddTaxonomyAndAssign({ parentId, label, captureId })` chosen over returning a node id from `addTaxonomyNode`, to keep create-and-assign atomic.
- `metadata.json` schema bumps from `1` to `2` because Feature 3 changes `exportFilename` to a relative path (e.g. `properties/property-list.png`).

## Your task

Run the `freehold-enhancements` initiative per the Orchestrator protocol in `.context/PROTOCOL.md`:

1. Read BRIEF.md, PLAN.md, TASKS.md.
2. There are no remaining Open Questions in PLAN.md — proceed.
3. Before dispatching the first Worker, ensure the branch is created: `feat/freehold-enhancements`. The user is currently on `main` with one unrelated dirty file (`.context/PROJECT.md`); do not stash or commit it on the new branch — leave it alone.
4. Dispatch a single Worker for Phase 1. The phase is sized for one session (~7 files, five small features, ordered smallest-first with one commit per feature).
5. Verify after the Worker returns that all five `feat(freehold): …` commits exist and `npm run build` in `workspace/freehold/` passes.
6. The phase ends at the `🔄 Handoff` task; on completion, emit the standard summary line and stop.

## Open questions

_None. All three resolved during planning (see PLAN.md "Open Questions" — struck through with resolutions inline)._
