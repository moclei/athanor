# Freehold Enhancements — Tasks

## Phase 1: Five UX Enhancements

**Session scope:** Five independent feature changes in `workspace/freehold/`, ordered smallest-first. ~7 files touched. One session.

**Branch:** `feat/freehold-enhancements`

### Feature 2 — Hide capture filename

- [x] Remove the `<div className="fh-capture-filename">{capture.filename}</div>` line from `workspace/freehold/ui/components/CaptureCard.tsx`
- [x] Remove the `.fh-capture-filename` CSS rule from `workspace/freehold/content-script/panel-styles.ts`
- [x] Verify build passes (`npm run build` in `workspace/freehold/`)
- [x] Commit: `feat(freehold): hide auto-generated filename on capture cards`

### Feature 4 — Draggable panel

- [x] Add `panelPosition` state to `workspace/freehold/config.ts` — `{ default: null as { top: number; left: number } | null, scope: Scope.Agent }` (no `persist`)
- [x] Add the same `panelPosition` field to `workspace/freehold/config.sw.ts` (state schema parity)
- [x] In `workspace/freehold/ui/App.tsx`: read `panelPosition`; if non-null, apply `style={{ top, left, right: 'auto' }}` to `.fh-panel`
- [x] In `App.tsx`: add `onPointerDown` handler on `.fh-header` that ignores events whose target matches `button, select, input` (so close button, project selector, etc. keep working); use pointer-capture, track delta during `pointermove`, write final position to Crann on `pointerup`
- [x] Clamp new position so the panel stays at least partially on-screen (~80px horizontally, ~40px vertically)
- [x] Add to `workspace/freehold/content-script/panel-styles.ts`: `.fh-header { cursor: grab; touch-action: none; user-select: none; }` and `.fh-header:active { cursor: grabbing; }`
- [x] Verify build (manual test deferred to user — no browser available in agent session)
- [x] Commit: `feat(freehold): draggable panel with per-tab position memory`

### Feature 5 — Click-to-place selection (alternative to drag)

- [ ] In `workspace/freehold/ui/components/RegionSelectionOverlay.tsx`: replace the `isDragging` ref + boolean drag state with a three-state machine (`'idle' | 'dragging' | 'following'`); see PLAN.md "Feature 5" for the transition table
- [ ] On `mouseup` while `dragging`: if cursor moved < 5px since `mousedown`, transition to `following` (start position retained, current keeps tracking) instead of cancelling
- [ ] In `following`: `mousemove` updates `current`; the next `mousedown` commits via `onComplete`
- [ ] Selection rectangle (`.fh-selection-rect`) renders in both `dragging` and `following` states
- [ ] Escape continues to cancel from any state
- [ ] If the final committed rect is < 5px in either dimension (e.g. two clicks in nearly the same spot), call `onCancel` instead of capturing a degenerate region
- [ ] Verify build, manual test: classic drag still works as before; quick-click → move cursor freely → click again completes; Escape cancels mid-flow
- [ ] Commit: `feat(freehold): click-to-place region selection alongside drag`

### Feature 3 — Subfolder export by group

- [ ] In `workspace/freehold/ui/gallery/export-project.ts`: compute `groupSlug` per entry as `slugify(taxonomyPath[0])` or `'uncategorized'` when missing; add it to the `ExportEntry` interface
- [ ] Replace single `taken: Set<string>` with per-folder collision tracking (`Map<string, Set<string>>` keyed by `groupSlug`); call `pickUniqueFilename` against the per-folder set
- [ ] Cache subfolder handles in a `Map<string, FileSystemDirectoryHandle>`; resolve via `dirHandle.getDirectoryHandle(groupSlug, { create: true })`
- [ ] Pass the per-folder handle to `writeBlob` for each capture
- [ ] Update `metadata.json`: change `exportFilename` field to the relative path (e.g. `properties/property-list.png`); bump `schemaVersion` from `1` to `2`
- [ ] Keep `metadata.json` itself at the root of the picked directory
- [ ] Verify build, manual test: export a project, confirm subfolder structure appears, untagged captures land in `uncategorized/`, no filename collisions across groups
- [ ] Commit: `feat(freehold): export captures into per-group subfolders`

### Feature 1 — Quick-Add taxonomy from CategoryPicker

- [ ] Add new action `quickAddTaxonomyAndAssign` to `workspace/freehold/config.ts` as a stub: `handler: async (_ctx, _args: { parentId: string; label: string; captureId: string }) => {}`
- [ ] Implement `quickAddTaxonomyAndAssign` in `workspace/freehold/config.sw.ts`: create new TaxonomyNode under `parentId` (append to children), update target capture's `taxonomyNodeId` to the new node's id, write both mutations in a single `setState` call
- [ ] Replace native `<select>` in `workspace/freehold/ui/components/CategoryPicker.tsx` with a custom popover dropdown component:
  - Trigger button shows current selection label or "Uncategorized"
  - Popover lists "Uncategorized" + each top-level group (group label header → child rows clickable → "+ Add tag" row)
  - "+ Add tag" replaces itself with an inline `<input autoFocus />`; Enter calls `quickAddTaxonomyAndAssign({ parentId: group.id, label, captureId })`; Escape or blur cancels
  - Outside-click closes popover (listener on shadow host, not document)
  - Selecting a child node calls `updateCapture({ taxonomyNodeId })` (existing behaviour)
- [ ] Add CSS in `workspace/freehold/content-script/panel-styles.ts` for the new popover (`.fh-cat-trigger`, `.fh-cat-popover`, `.fh-cat-group`, `.fh-cat-option`, `.fh-cat-add-row`, `.fh-cat-add-input`); match existing visual language (border-radius 6–7px, font-size 11–12px, neutral grey palette)
- [ ] Verify build, manual test: existing tag selection still works, "+ Add tag" creates a node visible in the Taxonomy tab, the new node is immediately assigned to the capture, picker closes, list reflects the new tag
- [ ] Commit: `feat(freehold): quick-add taxonomy tags inline from capture picker`

### Wrap

- [ ] Run final `npm run build` from `workspace/freehold/`; confirm `dist/` rebuilt with no errors
- [ ] 🔄 Handoff

# --- handoff point ---

## Deferred

_(none yet)_
