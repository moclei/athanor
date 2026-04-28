# Freehold Enhancements

## Intent

Five small UX improvements to the working Freehold extension surfaced from real use: faster taxonomy authoring inline with capture, less noise on capture cards, group-based folder structure on export, the ability to move the panel out of the way to see what's behind it, and a less awkward way to draw large selection regions.

## Goals

- Tagging a capture with a new taxonomy node never requires leaving the Capture tab.
- Capture cards show only information the user can act on or recognise (no auto-generated filenames).
- Exported projects land in a folder structure the user can navigate by topic, not a flat dump.
- The panel can be moved when it occludes content the user needs to see, without losing position when toggled off and on again in the same tab.
- Region selection works for large areas without requiring the user to keep a finger held down across a long mousepad sweep.

## Scope

**In:**
- `CategoryPicker` Quick-Add: inline `+` per group → text input → Enter creates a new taxonomy node under that group and assigns it to the capture in one step.
- Hide `capture.filename` from `CaptureCard` UI (data still persisted unchanged).
- `exportProject` writes screenshots into per-group subfolders (slugified top-level taxonomy label) inside the user-picked directory; untagged captures go to `uncategorized/`.
- Draggable `.fh-panel` via the `.fh-header` bar; position lives in Crann `Scope.Agent` state (per-tab, survives panel close/reopen, lost on page reload).
- `RegionSelectionOverlay` accepts a click-release-click selection method in addition to the existing mouse-down-drag-release method; both modes coexist without a UI toggle.

**Out:**
- Renaming, repositioning, or restructuring the underlying `filename` field on `Capture` (still used internally and in metadata.json).
- Changing the capture-time storage path (captures continue to live in IndexedDB; this initiative does not introduce a `chrome.downloads` write-through).
- Resizable panel, snap-to-edge, or remembering position across page reloads.
- Per-tag (leaf) subfolders or nested subfolder hierarchies — only top-level group folders.
- Reflowing metadata.json schema beyond what the new export paths require.

## Constraints

- Crann actions must stay declared in both `config.ts` (stub) and `config.sw.ts` (impl); any new action lands in both.
- Custom dropdown for `CategoryPicker` must work inside the closed shadow root and must not regress keyboard accessibility (Enter to confirm, Escape to cancel the inline form).
- Drag implementation must not interfere with existing `.fh-close-btn` or `ProjectSelector` clicks inside `.fh-header`.
- No new dependencies. Drag is plain pointer events; dropdown is plain React.
- Export subfolder names come from the live taxonomy at export time (consistent with the existing rule in `findTaxonomyPath`), not from the capture's stored filename.
