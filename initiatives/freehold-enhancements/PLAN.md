# Freehold Enhancements — Plan

## Approach

One phase, five small features, ordered smallest-first so progress commits land early. All work lives in `workspace/freehold/`. No new deps. No changes to data shapes that would invalidate existing stored projects.

Order:
1. **Hide filename** in `CaptureCard` (UI only).
2. **Draggable panel** — new Crann `Scope.Agent` state + drag handler on `.fh-header` + inline style on `.fh-panel`.
3. **Click-to-place selection** — extend `RegionSelectionOverlay` with an alternative two-click selection method that coexists with the existing drag method.
4. **Subfolder export** — modify `ui/gallery/export-project.ts` to nest writes under per-group subfolders (top-level group only; matches existing `taxonomyPath[0]`).
5. **Quick-Add taxonomy** — replace native `<select>` in `CategoryPicker` with a custom React popover dropdown that supports an inline "add new" input under each top-level group; add a single composite SW action that atomically creates the node and assigns it to the capture.

## Technical Notes

### Feature 1 — Quick-Add taxonomy (largest)

`CategoryPicker` currently renders a native `<select>` with `<optgroup>` per top-level node. Native `<select>` cannot host arbitrary children (no inline inputs, no buttons). To add a per-group "+" affordance with an inline input, the picker becomes a **custom React popover** — a small floating panel anchored to the trigger button, rendered inline inside the React tree. **Not a modal**: no scrim, no overlay, no blocking the rest of the panel; click outside dismisses.

- Trigger button shows the current selection label (or "Uncategorized").
- Click → popover opens, anchored to the trigger, rendered inside the shadow root (no portal needed; React already mounts inside the shadow tree).
- For each top-level group: group label, then its child nodes as clickable rows, then a "+ Add tag" row at the bottom.
- Clicking "+ Add tag" replaces that row with an inline `<input>` (autoFocus). Enter commits, Escape cancels, blur cancels.
- Outside-click closes the popover (listener attached to the shadow host, not `document`, to keep it scoped).
- Keyboard: Tab/Shift-Tab moves focus naturally; Escape closes.

A new SW action `quickAddTaxonomyAndAssign({ parentId, label, captureId })` performs both mutations atomically:

```ts
quickAddTaxonomyAndAssign: {
  handler: async (ctx, args: { parentId: string; label: string; captureId: string }) => {
    // 1. insert node under parentId at end
    // 2. find capture, set taxonomyNodeId = newNode.id
    // 3. setState once with both mutations
  },
}
```

This avoids the round-trip "create node → wait for state → look up new id → assign" dance from the client. Action declared in `config.ts` (stub) and implemented in `config.sw.ts`.

The picker only allows Quick-Add under existing top-level groups — not at the root and not under non-top-level nodes. The data model and `TaxonomyTree` UI both support arbitrary depth (every node has an "Add Child" item in its `⋮` menu, the renderer is recursive), but the typical capture-tagging workflow operates against the first two levels. Anything deeper is built explicitly via the Taxonomy tab.

### Feature 2 — Hide filename

Remove the `<div className="fh-capture-filename">{capture.filename}</div>` line from `CaptureCard.tsx`. Drop the `.fh-capture-filename` CSS rule from `panel-styles.ts`. The `capture.filename` field stays on the data model (still used by metadata.json's `originalFilename`).

### Feature 3 — Subfolder export

Modify `ui/gallery/export-project.ts`. **Confirmed**: subfolder is the **top-level group only** (i.e. `taxonomyPath[0]`), regardless of how deep the tagged node sits. Example: a capture tagged `Property & Unit Management > Property List > Listing Cards` exports to `property-and-unit-management/003.png`, not a nested path.

- Compute `groupSlug` per entry: the slugified top-level taxonomy label (i.e. `taxonomyPath[0]`); fall back to `'uncategorized'` for null path or empty first segment.
- Group entries by `groupSlug` for filename-collision tracking — collisions are now per-folder, not per-export. (Replace the single `taken: Set<string>` with `Map<string, Set<string>>` keyed by groupSlug.)
- For each entry, resolve the subfolder via `dirHandle.getDirectoryHandle(groupSlug, { create: true })` (cache the handles so we don't reopen them).
- Pass the per-folder handle to `writeBlob`.
- Update `metadata.json` to include the relative path: change `exportFilename` to a path like `properties/property-list.png`, or add a sibling `exportPath` field. **Decision**: change `exportFilename` to the relative path (single source of truth, simpler downstream tooling). This is a breaking change for any external consumer of `metadata.json` v1, so bump `schemaVersion` to 2.
- `metadata.json` itself stays at the root of the picked directory.
- `exportBaseName` and `pickUniqueFilename` continue unchanged — they operate on file basenames; the subfolder concern is layered on top in `exportProject`.

### Feature 4 — Draggable panel

Add Crann state:

```ts
panelPosition: {
  default: null as { top: number; left: number } | null,
  scope: Scope.Agent,
},
```

`Scope.Agent`, no `persist` → per-tab, lives as long as the agent (content script) is connected; lost on page reload. This matches the user's "session" intent.

In `App.tsx`:

- Read `panelPosition` from Crann state.
- When non-null, override `.fh-panel`'s default `top: 16px; right: 16px` via inline style: `{ top, left, right: 'auto' }`.
- Attach `onPointerDown` to `.fh-header`, but ignore the event if `e.target.closest('.fh-close-btn, .fh-project-select, button, select, input')` matches — only the bare header bar starts a drag.
- Use pointer-capture on the header element. Track delta on `pointermove`. Update local state during drag (cheap re-render) and write to Crann on `pointerup` (one network round-trip per drag).
- Clamp the new position so the panel stays at least partially on-screen: `left ∈ [-(panelWidth - 80), window.innerWidth - 80]`, `top ∈ [0, window.innerHeight - 40]`.
- Add CSS: `.fh-header { cursor: grab; touch-action: none; }`, `.fh-header:active { cursor: grabbing; }`. Buttons inside the header keep their own cursor via specificity.

The panel still uses `position: fixed`; only the offsets change.

### Feature 5 — Click-to-place selection (alternative to drag)

Extend `RegionSelectionOverlay.tsx` to support a two-click selection method that coexists with the existing mouse-down-drag-up method. No mode toggle: the overlay infers intent from user behaviour.

State machine (replaces the current `isDragging` ref + `drag` state):

```
states: idle | dragging | following

idle:
  mousedown(x, y) → set start=(x,y), current=(x,y) → dragging
  Escape           → cancel

dragging:
  mousemove(x, y)  → update current=(x,y)
  mouseup          → if dist(start, current) >= THRESHOLD → complete
                     else → following  (keep start, current keeps tracking mouse)
  Escape           → cancel

following:
  mousemove(x, y)  → update current=(x,y)
  mousedown        → complete with rect(start, current)
  Escape           → cancel
```

- `THRESHOLD` = the existing 5px minimum (already used to discriminate accidental drags from real ones).
- `complete` calls `toRect(start, current)`; if the resulting rect is still < 5px in either dimension at completion time (e.g. user clicked twice in nearly the same spot in `following` mode), cancel rather than capture a degenerate region.
- During `following`, the visual `.fh-selection-rect` continues to render — the user sees the selection grow with the cursor, just without holding a button.
- No new keyboard shortcut; Escape cancels any state.
- `pointerleave` on the overlay does not auto-cancel `following` — the user might intentionally move the cursor outside the viewport. (We can revisit if this turns out to be confusing.)

Switch the handlers from React `onMouseDown/onMouseMove/onMouseUp` (which only fire on the overlay element) to window-level pointer event listeners attached in `useEffect`, OR keep them on the overlay element since `.fh-overlay` already covers the full viewport (`width: 100vw; height: 100vh`). The overlay-element approach is simpler and matches the current code; sticking with it.

## Rejected Approaches

- Returning the new node id from `addTaxonomyNode` instead of a composite action — works, but adds a state-subscription dance on the client and leaves a brief uncategorized window where the new node exists but isn't assigned. Composite action is atomic and simpler.
- Quick-Add at any tree depth — out of scope; matches the existing two-level taxonomy convention and avoids dropdown design questions about nesting.
- Adding `chrome.downloads` write-through to put captures into group subfolders at capture time — would require re-introducing the original `downloads.ts` design that was already removed in favour of IndexedDB + gallery export. Out of scope; the gallery is the single export point.
- Persisting panel position to `Persist.Local` — survives reloads but pollutes per-tab state across all tabs. User explicitly asked for session-only.
- Making `.fh-panel` itself the drag handle — would conflict with text selection and clicks on internal controls. Header-only is standard and unambiguous.
- Explicit toggle button to switch between drag and click-to-place selection modes — adds UI and a state the user has to remember. Implicit hybrid (drag if you drag, two-click if you don't) covers both intents with no surface area.
- Using a modal for the new `CategoryPicker` — would block the rest of the panel and cause the focus/scroll issues the user is trying to avoid. Inline anchored popover is the right shape.

## Open Questions

1. ~~**Feature 3 subfolder granularity.** Confirm the subfolder is the **top-level group** label, not the full taxonomy path.~~ **Resolved**: top-level group only. Captures tagged at any depth resolve to `slugify(taxonomyPath[0])`.
2. ~~**Feature 3 underlying mechanism.** Confirm subfolder behaviour belongs in `exportProject` (gallery), not capture-time `chrome.downloads`.~~ **Resolved**: `exportProject` is correct. No capture-time `chrome.downloads` writes are introduced.
3. ~~**Feature 1 scope.** Quick-Add only under existing top-level groups.~~ **Resolved**: top-level groups only. (Note: data model and Taxonomy tab UI both support arbitrary depth via "Add Child"; this constraint is purely for the Quick-Add affordance in the Capture tab picker.)
